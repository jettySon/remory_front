import { useMemo, useRef, useState } from 'react';
import type { CellValue, Sheet } from 'read-excel-file/browser';
import { cardFields, validateDraft, type BulkRow } from '../study/cards';
import type { CardKind } from '../types';

function readCellText(cell: CellValue | null): string {
  if (cell instanceof Date) return cell.toISOString().replace(/T00:00:00\.000Z$/, '');
  return cell == null ? '' : String(cell).trim();
}

export function useExcelImport(kind: CardKind) {
  const fields = cardFields[kind].fields;
  const [workbook, setWorkbook] = useState<Sheet[]>([]);
  const [sheetName, setSheetName] = useState('');
  const [headerOverride, setHeaderOverride] = useState<boolean | null>(null);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [fileName, setFileName] = useState('');
  const readRequest = useRef(0);
  const sheet = workbook.find((item) => item.sheet === sheetName);
  const firstRow = sheet?.data[0];
  const hasMatchingHeader =
    firstRow !== undefined &&
    fields.every((field, index) => readCellText(firstRow[index] ?? null) === field) &&
    firstRow.slice(fields.length).every((cell) => !readCellText(cell));
  const skipHeader = headerOverride ?? hasMatchingHeader;
  const excelRows = useMemo(() => {
    const rows: BulkRow[] = [];
    sheet?.data.forEach((cells, index) => {
      if (skipHeader && index === 0) return;
      const values = cells.map(readCellText);
      while (values.length && !values[values.length - 1]) values.pop();
      if (values.length) rows.push({ line: index + 1, values });
    });
    return rows;
  }, [sheet, skipHeader]);
  const excelRowError = useMemo(() => {
    for (const row of excelRows) {
      const issue = validateDraft(kind, row.values);
      if (issue) return `${row.line}행 · ${issue}`;
    }
    return '';
  }, [excelRows, kind]);

  async function loadWorkbook(file?: File) {
    const request = ++readRequest.current;
    setWorkbook([]);
    setSheetName('');
    setFileError('');
    setFileName(file?.name ?? '');
    setHeaderOverride(null);
    if (!file || !/\.xlsx$/i.test(file.name)) {
      setReading(false);
      if (file) setFileError('.xlsx 형식의 엑셀 파일을 선택해 주세요.');
      return;
    }

    setReading(true);
    try {
      const { default: readXlsxFile } = await import('read-excel-file/browser');
      const sheets = await readXlsxFile(file);
      if (request !== readRequest.current) return;
      setWorkbook(sheets);
      setSheetName(sheets[0]?.sheet ?? '');
      if (!sheets.length) setFileError('가져올 수 있는 시트가 없어요.');
    } catch {
      if (request === readRequest.current)
        setFileError('파일을 읽지 못했어요. 엑셀에서 열리는지 확인한 뒤 다시 선택해 주세요.');
    } finally {
      if (request === readRequest.current) setReading(false);
    }
  }

  function selectSheet(name: string) {
    setSheetName(name);
    setHeaderOverride(null);
  }

  return {
    workbook,
    sheetName,
    sheet,
    skipHeader,
    excelRows,
    reading,
    fileError,
    fileName,
    excelRowError,
    loadWorkbook,
    selectSheet,
    setHeaderOverride,
  };
}

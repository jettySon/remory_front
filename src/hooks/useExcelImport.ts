import { useMemo, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import { languages, translators, type MessageKey } from '../i18n/messages';
import type { CellValue, Sheet } from 'read-excel-file/browser';
import { cardFields, validateDraft, type BulkRow } from '../study/cards';
import type { CardKind } from '../types';

function readCellText(cell: CellValue | null): string {
  if (cell instanceof Date) return cell.toISOString().replace(/T00:00:00\.000Z$/, '');
  return cell == null ? '' : String(cell).trim();
}

export function useExcelImport(kind: CardKind) {
  const { t } = useLanguage();
  const fields = cardFields[kind].fields;
  const [workbook, setWorkbook] = useState<Sheet[]>([]);
  const [sheetName, setSheetName] = useState('');
  const [headerOverride, setHeaderOverride] = useState<boolean | null>(null);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<MessageKey | ''>('');
  const [fileName, setFileName] = useState('');
  const readRequest = useRef(0);
  const sheet = workbook.find((item) => item.sheet === sheetName);
  const firstRow = sheet?.data[0];
  const hasMatchingHeader =
    firstRow !== undefined &&
    languages.some(({ value }) =>
      fields.every((field, index) => readCellText(firstRow[index] ?? null) === translators[value](field)),
    ) &&
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
      if (issue) return t('import.excelRow', { line: row.line, error: t(...issue) });
    }
    return '';
  }, [excelRows, kind, t]);

  async function loadWorkbook(file?: File) {
    const request = ++readRequest.current;
    setWorkbook([]);
    setSheetName('');
    setFileError('');
    setFileName(file?.name ?? '');
    setHeaderOverride(null);
    if (!file || !/\.xlsx$/i.test(file.name)) {
      setReading(false);
      if (file) setFileError('import.wrongFile');
      return;
    }

    setReading(true);
    try {
      const { default: readXlsxFile } = await import('read-excel-file/browser');
      const sheets = await readXlsxFile(file);
      if (request !== readRequest.current) return;
      setWorkbook(sheets);
      setSheetName(sheets[0]?.sheet ?? '');
      if (!sheets.length) setFileError('import.noSheets');
    } catch {
      if (request === readRequest.current)
        setFileError('import.readFailed');
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
    fileError: fileError && t(fileError),
    fileName,
    excelRowError,
    loadWorkbook,
    selectSheet,
    setHeaderOverride,
  };
}

import { Download } from 'lucide-react';
import SelectField from '../SelectField';
import type { useExcelImport } from '../../hooks/useExcelImport';
import { cardFields } from '../../study/cards';
import type { CardKind } from '../../types';

export function ExcelImportFields({
  kind,
  excelImport,
}: {
  kind: CardKind;
  excelImport: ReturnType<typeof useExcelImport>;
}) {
  const {
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
  } = excelImport;
  const fields = cardFields[kind].fields;
  return (
    <>
      <div className="workbook-template">
        <a href={`./templates/${kind}.xlsx`} download={`리모리-${cardFields[kind].label}-양식.xlsx`}>
          <Download size={16} aria-hidden="true" /> {cardFields[kind].label} 양식 다운로드
        </a>
        <span className="field-hint">첫 행은 그대로 두고, 예시 두 줄을 학습할 내용으로 바꿔 주세요.</span>
      </div>
      <label htmlFor="bulk-workbook">엑셀 파일 선택</label>
      <div id="bulk-workbook-hint" className="field-hint">
        <span>엑셀 파일(.xlsx)의 A열부터 아래 순서대로 채워 주세요.</span>
        <span>
          <strong>열 순서</strong> {fields.join(' → ')}
        </span>
      </div>
      <div className="workbook-picker">
        <input
          id="bulk-workbook"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-describedby="bulk-workbook-hint workbook-name"
          onClick={(e) => {
            e.currentTarget.value = '';
          }}
          onChange={(e) => {
            if (e.target.files?.[0]) void loadWorkbook(e.target.files[0]);
          }}
        />
        <span className="workbook-picker-action" aria-hidden="true">
          {fileName ? '파일 변경' : '파일 찾아보기'}
        </span>
        <span id="workbook-name" className="workbook-name">
          {fileName || '선택한 파일 없음'}
        </span>
      </div>
      {workbook.length > 1 && (
        <SelectField
          label="가져올 시트"
          value={sheetName}
          options={workbook.map((item) => ({ value: item.sheet, label: item.sheet }))}
          onChange={selectSheet}
        />
      )}
      {sheet && (
        <label className="workbook-header">
          <input type="checkbox" checked={skipHeader} onChange={(e) => setHeaderOverride(e.target.checked)} />
          첫 행을 열 제목으로 사용
        </label>
      )}
      {(fileError || excelRowError) && (
        <p className="form-error workbook-feedback" role="alert">
          {fileError || excelRowError}
        </p>
      )}
      <div className="field-hint" role="status">
        {reading
          ? '엑셀 파일을 읽는 중이에요.'
          : sheet &&
            !excelRowError &&
            (excelRows.length ? `등록할 카드 ${excelRows.length}장` : '이 시트에 등록할 카드가 없어요.')}
      </div>
    </>
  );
}

import { useLanguage } from '../../i18n/LanguageProvider';
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
  const { locale, t } = useLanguage();
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
  const type = t(cardFields[kind].label);
  const templateFolder = locale === 'ko' ? '' : `${locale}/`;
  return (
    <>
      <div className="workbook-template">
        <a href={`./templates/${templateFolder}${kind}.xlsx`} download={`${t('import.templateName', { type })}.xlsx`}>
          <Download size={16} aria-hidden="true" /> {t('import.template', { type })}
        </a>
        <span className="field-hint">{t('import.templateHint')}</span>
      </div>
      <label htmlFor="bulk-workbook">{t('import.pickExcel')}</label>
      <div id="bulk-workbook-hint" className="field-hint">
        <span>{t('import.excelHint')}</span>
        <span>
          <strong>{t('import.order')}</strong> {fields.map((field) => t(field)).join(' → ')}
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
          {fileName ? t('import.changeFile') : t('import.browse')}
        </span>
        <span id="workbook-name" className="workbook-name">
          {fileName || t('import.noFile')}
        </span>
      </div>
      {workbook.length > 1 && (
        <SelectField
          label={t('import.sheet')}
          value={sheetName}
          options={workbook.map((item) => ({ value: item.sheet, label: item.sheet }))}
          onChange={selectSheet}
        />
      )}
      {sheet && (
        <label className="workbook-header">
          <input type="checkbox" checked={skipHeader} onChange={(e) => setHeaderOverride(e.target.checked)} />
          {t('import.useHeader')}
        </label>
      )}
      {(fileError || excelRowError) && (
        <p className="form-error workbook-feedback" role="alert">
          {fileError || excelRowError}
        </p>
      )}
      <div className="field-hint" role="status">
        {reading
          ? t('import.reading')
          : sheet &&
            !excelRowError &&
            (excelRows.length ? t('import.ready', { count: excelRows.length }) : t('import.emptySheet'))}
      </div>
    </>
  );
}

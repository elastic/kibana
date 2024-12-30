/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useValues, useActions } from 'kea';

import { EuiTableRow, EuiTableRowCell, EuiTableRowCellCheckbox, EuiCheckbox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ResultSettingsLogic } from '../result_settings_logic';
import { FieldResultSetting } from '../types';

import { FieldNumber } from './field_number';

export const TextFieldsBody: React.FC = () => {
  const { isSnippetAllowed, textResultFields } = useValues(ResultSettingsLogic);
  const {
    toggleRawForField,
    updateRawSizeForField,
    clearRawSizeForField,
    toggleSnippetForField,
    updateSnippetSizeForField,
    clearSnippetSizeForField,
    toggleSnippetFallbackForField,
  } = useActions(ResultSettingsLogic);

  const resultSettingsArray: Array<[string, Partial<FieldResultSetting>]> = useMemo(() => {
    return Object.entries(textResultFields).sort(([aFieldName], [bFieldName]) =>
      aFieldName > bFieldName ? 1 : -1
    );
  }, [textResultFields]);

  return (
    <>
      {resultSettingsArray.map(([fieldName, fieldSettings]) => (
        <EuiTableRow key={fieldName}>
          <EuiTableRowCell data-test-subj="ResultSettingFieldName">
            <code>{fieldName}</code>
          </EuiTableRowCell>
          <EuiTableRowCellCheckbox>
            <EuiCheckbox
              aria-label={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.rawAriaLabel',
                { defaultMessage: 'Toggle raw field' }
              )}
              data-test-subj="ResultSettingRawCheckBox"
              id={`${fieldName}-raw}`}
              checked={!!fieldSettings.raw}
              onChange={() => {
                toggleRawForField(fieldName);
              }}
            />
          </EuiTableRowCellCheckbox>
          <EuiTableRowCell align="center" textOnly={false}>
            <FieldNumber
              fieldName={fieldName}
              fieldEnabledProperty="raw"
              fieldSizeProperty="rawSize"
              fieldSettings={fieldSettings}
              updateAction={updateRawSizeForField}
              clearAction={clearRawSizeForField}
            />
          </EuiTableRowCell>
          <EuiTableRowCellCheckbox>
            <EuiCheckbox
              aria-label={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.snippetAriaLabel',
                { defaultMessage: 'Toggle text snippet' }
              )}
              data-test-subj="ResultSettingSnippetTextBox"
              id={`${fieldName}-snippet}`}
              checked={!!fieldSettings.snippet}
              disabled={!isSnippetAllowed(fieldName)}
              onChange={() => {
                toggleSnippetForField(fieldName);
              }}
            />
          </EuiTableRowCellCheckbox>
          <EuiTableRowCellCheckbox>
            <EuiCheckbox
              aria-label={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.resultSettings.table.snippetFallbackAriaLabel',
                { defaultMessage: 'Toggle snippet fallback' }
              )}
              data-test-subj="ResultSettingFallbackTextBox"
              id={`${fieldName}-snippetFallback}`}
              checked={fieldSettings.snippetFallback}
              disabled={!fieldSettings.snippet}
              onChange={() => {
                toggleSnippetFallbackForField(fieldName);
              }}
            />
          </EuiTableRowCellCheckbox>
          <EuiTableRowCell align="center" textOnly={false}>
            <FieldNumber
              fieldName={fieldName}
              fieldEnabledProperty="snippet"
              fieldSizeProperty="snippetSize"
              fieldSettings={fieldSettings}
              updateAction={updateSnippetSizeForField}
              clearAction={clearSnippetSizeForField}
            />
          </EuiTableRowCell>
        </EuiTableRow>
      ))}
    </>
  );
};

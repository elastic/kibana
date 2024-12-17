/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFilePicker, EuiFormRow, EuiText } from '@elastic/eui';
import { isPlainObject } from 'lodash';
import type { RuleMigrationResourceData } from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { FILE_UPLOAD_ERROR } from '../../../../translations';
import type { SPLUNK_MACROS_COLUMNS } from '../../../../constants';
import { useParseFileInput, type SplunkRow } from '../../../common/use_parse_file_input';
import * as i18n from './translations';

type SplunkMacroResult = Partial<Record<(typeof SPLUNK_MACROS_COLUMNS)[number], string>>;

export interface MacrosFileUploadProps {
  createResources: (resources: RuleMigrationResourceData[]) => void;
  apiError?: string;
  isLoading?: boolean;
}
export const MacrosFileUpload = React.memo<MacrosFileUploadProps>(
  ({ createResources, apiError, isLoading }) => {
    const onFileParsed = useCallback(
      (content: Array<SplunkRow<SplunkMacroResult>>) => {
        const rules = content.map(formatMacroRow);
        createResources(rules);
      },
      [createResources]
    );

    const { parseFile, isParsing, error: fileError } = useParseFileInput(onFileParsed);

    const error = useMemo(() => {
      if (apiError) {
        return apiError;
      }
      return fileError;
    }, [apiError, fileError]);

    return (
      <EuiFormRow
        helpText={
          <EuiText color="danger" size="xs">
            {error}
          </EuiText>
        }
        isInvalid={error != null}
        fullWidth
      >
        <EuiFilePicker
          id="macrosFilePicker"
          fullWidth
          initialPromptText={
            <>
              <EuiText size="s" textAlign="center">
                {i18n.RULES_DATA_INPUT_FILE_UPLOAD_PROMPT}
              </EuiText>
            </>
          }
          accept="application/json, application/x-ndjson"
          onChange={parseFile}
          display="large"
          aria-label="Upload logs sample file"
          isLoading={isParsing || isLoading}
          disabled={isParsing || isLoading}
          data-test-subj="macrosFilePicker"
          data-loading={isParsing}
        />
      </EuiFormRow>
    );
  }
);
MacrosFileUpload.displayName = 'MacrosFileUpload';

const formatMacroRow = (row: SplunkRow<SplunkMacroResult>): RuleMigrationResourceData => {
  if (!isPlainObject(row.result)) {
    throw new Error(FILE_UPLOAD_ERROR.NOT_OBJECT);
  }
  const macroResource: Partial<RuleMigrationResourceData> = {
    type: 'macro',
    name: row.result.title,
    content: row.result.definition,
  };
  // resource document format validation delegated to API
  return macroResource as RuleMigrationResourceData;
};

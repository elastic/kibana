/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFilePicker, EuiFormRow, EuiText } from '@elastic/eui';
import { isPlainObject } from 'lodash';
import type { OriginalRule } from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { CreateMigration } from '../../../../../../service/hooks/use_create_migration';
import * as i18n from './translations';
import { FILE_UPLOAD_ERROR } from '../../../../translations';
import { useParseFileInput, type SplunkRow } from '../../../common/use_parse_file_input';
import type { SPLUNK_RULES_COLUMNS } from '../../../../constants';

type SplunkRulesResult = Partial<Record<(typeof SPLUNK_RULES_COLUMNS)[number], string>>;

export interface RulesFileUploadProps {
  createMigration: CreateMigration;
  apiError?: string;
  isLoading?: boolean;
  isCreated?: boolean;
}
export const RulesFileUpload = React.memo<RulesFileUploadProps>(
  ({ createMigration, apiError, isLoading, isCreated }) => {
    const onFileParsed = useCallback(
      (content: Array<SplunkRow<SplunkRulesResult>>) => {
        const rules = content.map(formatRuleRow);
        createMigration(rules);
      },
      [createMigration]
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
          id="rulesFilePicker"
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
          aria-label="Upload rules file"
          isLoading={isParsing || isLoading}
          disabled={isLoading || isCreated}
          data-test-subj="rulesFilePicker"
          data-loading={isParsing}
        />
      </EuiFormRow>
    );
  }
);
RulesFileUpload.displayName = 'RulesFileUpload';

const formatRuleRow = (row: SplunkRow<SplunkRulesResult>): OriginalRule => {
  if (!isPlainObject(row.result)) {
    throw new Error(FILE_UPLOAD_ERROR.NOT_OBJECT);
  }
  const originalRule: Partial<OriginalRule> = {
    id: row.result.id,
    vendor: 'splunk',
    title: row.result.title,
    query: row.result.search,
    query_language: 'spl',
    description: row.result['action.escu.eli5']?.trim() || row.result.description,
  };

  if (row.result['action.correlationsearch.annotations']) {
    try {
      originalRule.annotations = JSON.parse(row.result['action.correlationsearch.annotations']);
    } catch (error) {
      delete originalRule.annotations;
    }
  }
  // rule document format validation delegated to API
  return originalRule as OriginalRule;
};

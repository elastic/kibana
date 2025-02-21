/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { isPlainObject } from 'lodash';
import {
  EuiCode,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';
import type {
  EuiFilePickerClass,
  EuiFilePickerProps,
} from '@elastic/eui/src/components/form/file_picker/file_picker';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CreateRuleMigrationRequestBody } from '../../../../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { OriginalRule } from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { CreateMigration } from '../../../../../../service/hooks/use_create_migration';
import { FILE_UPLOAD_ERROR } from '../../../../translations';
import { useParseFileInput, type SplunkRow } from '../../../common/use_parse_file_input';
import type { SPLUNK_RULES_COLUMNS } from '../../../../constants';
import { UploadFileButton } from '../../../common/upload_file_button';
import * as i18n from './translations';

type SplunkRulesResult = Partial<Record<(typeof SPLUNK_RULES_COLUMNS)[number], string>>;

export interface RulesFileUploadProps {
  createMigration: CreateMigration;
  apiError?: string;
  isLoading?: boolean;
  isCreated?: boolean;
}
export const RulesFileUpload = React.memo<RulesFileUploadProps>(
  ({ createMigration, apiError, isLoading, isCreated }) => {
    const [rulesToUpload, setRulesToUpload] = useState<CreateRuleMigrationRequestBody>([]);
    const filePickerRef = useRef<EuiFilePickerClass>(null);

    const createRules = useCallback(() => {
      filePickerRef.current?.removeFiles();
      createMigration(rulesToUpload);
    }, [createMigration, rulesToUpload]);

    const onFileParsed = useCallback((content: Array<SplunkRow<SplunkRulesResult>>) => {
      const rules = content.map(formatRuleRow);
      setRulesToUpload(rules);
    }, []);

    const { parseFile, isParsing, error: fileError } = useParseFileInput(onFileParsed);

    const onFileChange = useCallback(
      (files: FileList | null) => {
        setRulesToUpload([]);
        parseFile(files);
      },
      [parseFile]
    );

    const error = useMemo(() => {
      if (apiError) {
        return apiError;
      }
      return fileError;
    }, [apiError, fileError]);

    const showLoader = isParsing || isLoading;
    const isDisabled = showLoader || isCreated;
    const isButtonDisabled = isDisabled || rulesToUpload.length === 0;

    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFormRow
            helpText={
              <EuiText color="subdued" size="xs">
                <FormattedMessage
                  id="xpack.securitySolution.siemMigrations.rulesFileUpload.disclaimer"
                  defaultMessage="Note: To avoid exceeding your LLM API rate limit when translating a large number of queries, consider exporting rules in batches, for example by adding {operator} to the query above"
                  values={{ operator: <EuiCode>{'| head'}</EuiCode> }}
                />
              </EuiText>
            }
            isInvalid={error != null}
            fullWidth
            error={error}
          >
            <EuiFilePicker
              id="rulesFilePicker"
              ref={filePickerRef as React.Ref<Omit<EuiFilePickerProps, 'stylesMemoizer'>>}
              fullWidth
              initialPromptText={
                <EuiText size="s" textAlign="center">
                  {i18n.RULES_DATA_INPUT_FILE_UPLOAD_PROMPT}
                </EuiText>
              }
              accept="application/json, application/x-ndjson"
              onChange={onFileChange}
              display="large"
              aria-label="Upload rules file"
              isLoading={showLoader}
              disabled={isDisabled}
              data-test-subj="rulesFilePicker"
              data-loading={isParsing}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
            <EuiFlexItem grow={false}>
              <UploadFileButton
                onClick={createRules}
                isLoading={showLoader}
                disabled={isButtonDisabled}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { isPlainObject } from 'lodash';
import { EuiFilePicker, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiText } from '@elastic/eui';
import type {
  EuiFilePickerClass,
  EuiFilePickerProps,
} from '@elastic/eui/src/components/form/file_picker/file_picker';
import type { SplunkRow } from '../../../../../../../common/hooks/use_parse_file_input';
import { useParseFileInput } from '../../../../../../../common/hooks/use_parse_file_input';
import { FILE_UPLOAD_ERROR } from '../../../../../../../common/translations/file_upload_error';
import { UploadFileButton } from '../../../../../../../common/components/upload_file_button';
import type { CreateRuleMigration } from '../../../../../../service/hooks/use_create_migration';
import type { CreateRuleMigrationRulesRequestBody } from '../../../../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { OriginalRule } from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { SPLUNK_RULES_COLUMNS } from '../../../../constants';
import * as i18n from './translations';

type SplunkRulesResult = Partial<Record<(typeof SPLUNK_RULES_COLUMNS)[number], string>>;

export interface RulesFileUploadProps {
  createMigration: CreateRuleMigration;
  isLoading: boolean;
  isCreated: boolean;
  onRulesFileChanged: (files: FileList | null) => void;
  migrationName: string | undefined;
  apiError: string | undefined;
}
export const RulesFileUpload = React.memo<RulesFileUploadProps>(
  ({ createMigration, migrationName, apiError, isLoading, isCreated, onRulesFileChanged }) => {
    const [rulesToUpload, setRulesToUpload] = useState<CreateRuleMigrationRulesRequestBody>([]);
    const filePickerRef = useRef<EuiFilePickerClass>(null);

    const createRules = useCallback(() => {
      if (migrationName) {
        filePickerRef.current?.removeFiles();
        createMigration(migrationName, rulesToUpload);
      }
    }, [createMigration, migrationName, rulesToUpload]);

    const onFileParsed = useCallback((content: Array<SplunkRow<SplunkRulesResult>>) => {
      const rules = content.map(formatRuleRow);
      setRulesToUpload(rules);
    }, []);

    const { parseFile, isParsing, error: fileError } = useParseFileInput(onFileParsed);

    const onFileChange = useCallback(
      (files: FileList | null) => {
        setRulesToUpload([]);
        onRulesFileChanged(files);
        parseFile(files);
      },
      [parseFile, onRulesFileChanged]
    );

    const error = useMemo(() => {
      if (apiError) {
        return apiError;
      }
      return fileError;
    }, [apiError, fileError]);

    const showLoader = isParsing || isLoading;
    const isDisabled = !migrationName || showLoader || isCreated;
    const isButtonDisabled = isDisabled || rulesToUpload.length === 0;

    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow isInvalid={error != null} fullWidth error={error}>
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
    severity: row.result['alert.severity'] as OriginalRule['severity'],
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { EuiFilePicker, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiText } from '@elastic/eui';
import type {
  EuiFilePickerClass,
  EuiFilePickerProps,
} from '@elastic/eui/src/components/form/file_picker/file_picker';
import { i18n } from '@kbn/i18n';
import { UploadFileButton } from '../../../../../../../common/components';
import type { CreateMigration } from '../../../../../../service/hooks/use_create_migration';
import * as i18nTranslations from './translations';
import { useParseFileInput } from '../../../../../../../common/hooks/use_parse_file_input';
import { MigrationSource } from '../../../../../../../common/types';

const SENTINEL_UPLOAD_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.sentinel.description',
  {
    defaultMessage:
      'Upload the Microsoft Sentinel ARM template JSON export containing your Analytics Rules.',
  }
);

export interface SentinelRulesJsonFileUploadProps {
  createMigration: CreateMigration;
  isLoading: boolean;
  isCreated: boolean;
  onRulesFileChanged: (files: FileList | null) => void;
  migrationName: string | undefined;
  apiError: string | undefined;
}

export const SentinelRulesJsonFileUpload = React.memo<SentinelRulesJsonFileUploadProps>(
  ({ createMigration, migrationName, apiError, isLoading, isCreated, onRulesFileChanged }) => {
    const [rulesToUpload, setRulesToUpload] = useState<string>();
    const filePickerRef = useRef<EuiFilePickerClass>(null);

    const createRules = useCallback(() => {
      if (migrationName && rulesToUpload) {
        filePickerRef.current?.removeFiles();
        createMigration({
          migrationName,
          rules: { json: rulesToUpload },
          vendor: MigrationSource.SENTINEL,
        });
      }
    }, [createMigration, migrationName, rulesToUpload]);

    const onJsonFileParsed = useCallback((content: string) => {
      setRulesToUpload(content);
    }, []);

    const { parseFile, isParsing, error: fileError } = useParseFileInput(onJsonFileParsed);

    const onFileChange = useCallback(
      (files: FileList | null) => {
        setRulesToUpload(undefined);
        onRulesFileChanged(files);
        parseFile(files);
      },
      [parseFile, onRulesFileChanged]
    );

    const validationError = useMemo(() => {
      if (apiError) {
        return apiError;
      }
      return fileError;
    }, [apiError, fileError]);

    const showLoader = isParsing || isLoading;
    const isDisabled = !migrationName || showLoader || isCreated;
    const isButtonDisabled = isDisabled || rulesToUpload == null;

    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="s">{SENTINEL_UPLOAD_DESCRIPTION}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow isInvalid={validationError != null} fullWidth error={validationError}>
            <EuiFilePicker
              isInvalid={validationError != null}
              id="rulesFilePicker"
              ref={filePickerRef as React.Ref<Omit<EuiFilePickerProps, 'stylesMemoizer'>>}
              fullWidth
              initialPromptText={
                <EuiText size="s" textAlign="center">
                  {i18nTranslations.RULES_DATA_INPUT_FILE_UPLOAD_PROMPT_SENTINEL}
                </EuiText>
              }
              accept={'.json'}
              onChange={onFileChange}
              display="large"
              aria-label="Upload Sentinel rules JSON file"
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
SentinelRulesJsonFileUpload.displayName = 'SentinelRulesJsonFileUpload';

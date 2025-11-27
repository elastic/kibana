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
import { UploadFileButton } from '../../../../../../../common/components';
import type { CreateMigration } from '../../../../../../service/hooks/use_create_migration';
import * as i18n from './translations';
import { MigrationSource } from '../../../../../../../common/types';
import { RULES_DATA_INPUT_CHECK_RESOURCES_DESCRIPTION } from '../check_resources/translations';
import { FILE_UPLOAD_ERROR } from '../../../../../../../common/translations/file_upload_error';

export interface RulesXMLFileUploadProps {
  createMigration: CreateMigration;
  isLoading: boolean;
  isCreated: boolean;
  onRulesFileChanged: (files: FileList | null) => void;
  migrationName: string | undefined;
  migrationSource: MigrationSource;
  apiError: string | undefined;
}

const RULES_DATA_INPUT_FILE_UPLOAD_PROMPT: Record<MigrationSource, string> = {
  [MigrationSource.SPLUNK]: i18n.RULES_DATA_INPUT_FILE_UPLOAD_PROMPT_SPLUNK,
  [MigrationSource.QRADAR]: i18n.RULES_DATA_INPUT_FILE_UPLOAD_PROMPT_QRADAR,
};

export const RulesXMLFileUpload = React.memo<RulesXMLFileUploadProps>(
  ({
    createMigration,
    migrationName,
    migrationSource,
    apiError,
    isLoading,
    isCreated,
    onRulesFileChanged,
  }) => {
    const [rulesToUpload, setRulesToUpload] = useState<string>();
    const filePickerRef = useRef<EuiFilePickerClass>(null);

    const createRules = useCallback(() => {
      if (migrationName && rulesToUpload) {
        filePickerRef.current?.removeFiles();
        createMigration({ migrationName, rules: rulesToUpload, migrationSource });
      }
    }, [createMigration, migrationName, migrationSource, rulesToUpload]);

    const onXMLFileParsed = useCallback((content: string) => {
      setRulesToUpload(content);
    }, []);

    const [isParsing, setIsParsing] = useState<boolean>(false);
    const [error, setError] = useState<string>();

    const parseFile = useCallback(
      (files: FileList | null) => {
        setError(undefined);

        if (!files || files.length === 0) {
          return;
        }

        const file = files[0];
        const reader = new FileReader();

        reader.onloadstart = () => setIsParsing(true);
        reader.onloadend = () => setIsParsing(false);

        reader.onload = function (e) {
          // We can safely cast to string since we call `readAsText` to load the file.
          const fileContent = e.target?.result as string | undefined;

          if (fileContent == null) {
            setError(FILE_UPLOAD_ERROR.CAN_NOT_READ);
            return;
          }

          if (fileContent === '' && e.loaded > 100000) {
            // V8-based browsers can't handle large files and return an empty string
            // instead of an error; see https://stackoverflow.com/a/61316641
            setError(FILE_UPLOAD_ERROR.TOO_LARGE_TO_PARSE);
            return;
          }

          try {
            onXMLFileParsed(fileContent);
          } catch (err) {
            setError(err.message);
          }
        };

        const handleReaderError = function () {
          const message = reader.error?.message;
          if (message) {
            setError(FILE_UPLOAD_ERROR.CAN_NOT_READ_WITH_REASON(message));
          } else {
            setError(FILE_UPLOAD_ERROR.CAN_NOT_READ);
          }
        };

        reader.onerror = handleReaderError;
        reader.onabort = handleReaderError;

        reader.readAsText(file);
      },
      [onXMLFileParsed]
    );

    const validationError = useMemo(() => {
      if (apiError) {
        return apiError;
      }
      return error;
    }, [apiError, error]);

    const onFileChange = useCallback(
      (files: FileList | null) => {
        onRulesFileChanged(files);
        parseFile(files);
      },
      [parseFile, onRulesFileChanged]
    );

    const showLoader = isParsing || isLoading;
    const isDisabled = !migrationName || showLoader || isCreated;
    const isButtonDisabled = isDisabled || rulesToUpload == null;

    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="s">{RULES_DATA_INPUT_CHECK_RESOURCES_DESCRIPTION}</EuiText>
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
                  {RULES_DATA_INPUT_FILE_UPLOAD_PROMPT[migrationSource]}
                </EuiText>
              }
              accept={
                migrationSource === MigrationSource.SPLUNK
                  ? 'application/json, application/x-ndjson'
                  : '.xml'
              }
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
RulesXMLFileUpload.displayName = 'RulesXMLFileUpload';

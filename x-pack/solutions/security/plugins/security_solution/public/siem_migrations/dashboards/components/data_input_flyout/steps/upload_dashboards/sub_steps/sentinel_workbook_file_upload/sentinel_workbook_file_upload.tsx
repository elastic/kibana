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
import { UploadFileButton } from '../../../../../../../common/components/migration_steps';
import type { CreateMigration } from '../../../../../../service/hooks/use_create_migration';
import * as i18n from './translations';
import { useParseFileInput } from '../../../../../../../common/hooks/use_parse_file_input';
import { MigrationSource } from '../../../../../../../common/types';
import type { SentinelWorkbookArmResource } from '../../../../../../../../../common/siem_migrations/model/vendor/dashboards/sentinel.gen';

export interface SentinelWorkbookFileUploadProps {
  createMigration: CreateMigration;
  isLoading: boolean;
  isCreated: boolean;
  onWorkbookFileChanged: (files: FileList | null) => void;
  migrationName: string | undefined;
  apiError: string | undefined;
}

/**
 * Extracts Workbook resources from a parsed Sentinel ARM template JSON export.
 * Supports two shapes:
 * 1. ARM template wrapper: `{ "resources": [...] }`
 * 2. A direct array of resource objects: `[...]`
 */
const extractResources = (parsed: unknown): SentinelWorkbookArmResource[] => {
  if (Array.isArray(parsed)) {
    return parsed as SentinelWorkbookArmResource[];
  }
  if (
    parsed &&
    typeof parsed === 'object' &&
    'resources' in parsed &&
    Array.isArray((parsed as { resources: unknown }).resources)
  ) {
    return (parsed as { resources: SentinelWorkbookArmResource[] }).resources;
  }
  throw new Error(
    'Unrecognized Sentinel Workbook export format. Expected an ARM template with a "resources" array or a direct array of Workbook resource objects.'
  );
};

export const SentinelWorkbookFileUpload = React.memo<SentinelWorkbookFileUploadProps>(
  ({ createMigration, migrationName, apiError, isLoading, isCreated, onWorkbookFileChanged }) => {
    const [resourcesToUpload, setResourcesToUpload] = useState<SentinelWorkbookArmResource[]>();
    const filePickerRef = useRef<EuiFilePickerClass>(null);

    const createWorkbooks = useCallback(() => {
      if (migrationName && resourcesToUpload) {
        filePickerRef.current?.removeFiles();
        createMigration(
          migrationName,
          { vendor: 'microsoft-sentinel', resources: resourcesToUpload },
          MigrationSource.SENTINEL
        );
      }
    }, [createMigration, migrationName, resourcesToUpload]);

    const onJsonFileParsed = useCallback((content: string) => {
      const parsed = JSON.parse(content);
      const resources = extractResources(parsed);
      setResourcesToUpload(resources);
    }, []);

    const { parseFile, isParsing, error: fileError } = useParseFileInput(onJsonFileParsed);

    const onFileChange = useCallback(
      (files: FileList | null) => {
        setResourcesToUpload(undefined);
        onWorkbookFileChanged(files);
        parseFile(files);
      },
      [parseFile, onWorkbookFileChanged]
    );

    const validationError = useMemo(() => {
      if (apiError) {
        return apiError;
      }
      return fileError;
    }, [apiError, fileError]);

    const showLoader = isParsing || isLoading;
    const isDisabled = !migrationName || showLoader || isCreated;
    const isButtonDisabled = isDisabled || resourcesToUpload === undefined;

    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="s">{i18n.SENTINEL_WORKBOOK_FILE_UPLOAD_DESCRIPTION}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow isInvalid={validationError != null} fullWidth error={validationError}>
            <EuiFilePicker
              isInvalid={validationError != null}
              id="sentinelWorkbookFilePicker"
              ref={filePickerRef as React.Ref<Omit<EuiFilePickerProps, 'stylesMemoizer'>>}
              fullWidth
              initialPromptText={
                <EuiText size="s" textAlign="center">
                  {i18n.SENTINEL_WORKBOOK_FILE_UPLOAD_PROMPT}
                </EuiText>
              }
              accept={'.json'}
              onChange={onFileChange}
              display="large"
              aria-label="Upload Sentinel Workbook JSON file"
              isLoading={showLoader}
              disabled={isDisabled}
              data-test-subj="sentinelWorkbookFilePicker"
              data-loading={isParsing}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
            <EuiFlexItem grow={false} data-test-subj="sentinelWorkbookUploadFileButton">
              <UploadFileButton
                onClick={createWorkbooks}
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
SentinelWorkbookFileUpload.displayName = 'SentinelWorkbookFileUpload';

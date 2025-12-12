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
import { UploadFileButton } from '../../../../../../../common/components/migration_steps';
import { FILE_UPLOAD_ERROR } from '../../../../../../../common/translations/file_upload_error';
import type { SplunkRow } from '../../../../../../../common/hooks/use_parse_file_input';
import {
  parseContent,
  useParseFileInput,
} from '../../../../../../../common/hooks/use_parse_file_input';
import * as i18n from './translations';
import type { SplunkDashboardsResult, OnMigrationCreated } from '../../../../types';
import type { CreateMigration } from '../../../../../../service/hooks/use_create_migration';
import type { SplunkOriginalDashboardExport } from '../../../../../../../../../common/siem_migrations/model/vendor/dashboards/splunk.gen';
import type { CreateDashboardMigrationDashboardsRequestBody } from '../../../../../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';

export interface DashboardsFileUploadProps {
  createMigration: CreateMigration;
  isLoading: boolean;
  isCreated: boolean;
  onDashboardsFileChanged?: (files: FileList | null) => void;
  migrationName: string | undefined;
  apiError: string | undefined;
  onFileUpload?: (dashboards: SplunkDashboardsResult[]) => void;
  onMigrationCreated: OnMigrationCreated;
}
export const DashboardsFileUpload = React.memo<DashboardsFileUploadProps>(
  ({
    migrationName,
    apiError,
    isLoading,
    isCreated,
    onDashboardsFileChanged,
    onFileUpload,
    createMigration,
  }) => {
    const [uploadedDashboards, setUploadedDashboards] = useState<SplunkDashboardsResult[]>([]);
    const filePickerRef = useRef<EuiFilePickerClass>(null);

    const onFileParsed = useCallback(
      (content: string) => {
        const dashboards = parseContent(content).map(
          formatDashboardRow
        ) as SplunkDashboardsResult[];
        setUploadedDashboards(dashboards);
        onFileUpload?.(dashboards);
      },
      [onFileUpload]
    );

    const createDashboards = useCallback(() => {
      if (migrationName) {
        filePickerRef.current?.removeFiles();
        createMigration?.(
          migrationName,
          uploadedDashboards as CreateDashboardMigrationDashboardsRequestBody
        );
      }
    }, [migrationName, createMigration, uploadedDashboards]);

    const { parseFile, isParsing, error: fileError } = useParseFileInput(onFileParsed);

    const onFileChange = useCallback(
      (files: FileList | null) => {
        setUploadedDashboards([]);
        onDashboardsFileChanged?.(files);
        parseFile(files);
      },
      [parseFile, onDashboardsFileChanged]
    );

    const error = useMemo(() => {
      if (apiError) {
        return apiError;
      }
      return fileError;
    }, [apiError, fileError]);

    const showLoader = isParsing || isLoading;
    const isDisabled = !migrationName || showLoader || isCreated;

    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow isInvalid={error != null} fullWidth error={error}>
            <EuiFilePicker
              isInvalid={error != null}
              id="dashboardsFilePicker"
              ref={filePickerRef as React.Ref<Omit<EuiFilePickerProps, 'stylesMemoizer'>>}
              fullWidth
              initialPromptText={
                <EuiText size="s" textAlign="center">
                  {i18n.DASHBOARDS_DATA_INPUT_FILE_UPLOAD_PROMPT}
                </EuiText>
              }
              accept="application/json, application/x-ndjson"
              onChange={onFileChange}
              display="large"
              aria-label="Upload dashboards file"
              isLoading={showLoader}
              disabled={isDisabled}
              data-test-subj="dashboardsFilePicker"
              data-loading={isParsing}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
            <EuiFlexItem grow={false} data-test-subj="dashboardsUploadFileButton">
              <UploadFileButton
                onClick={createDashboards}
                isLoading={showLoader}
                disabled={false}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
DashboardsFileUpload.displayName = 'DashboardsFileUpload';

const formatDashboardRow = (
  row: SplunkRow<SplunkDashboardsResult>
): SplunkOriginalDashboardExport => {
  if (!isPlainObject(row.result)) {
    throw new Error(FILE_UPLOAD_ERROR.NOT_OBJECT);
  }
  return row as SplunkOriginalDashboardExport;
};

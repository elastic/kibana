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
import { FILE_UPLOAD_ERROR } from '../../../../../../../common/translations/file_upload_error';
import type { SplunkRow } from '../../../../../../../common/hooks/use_parse_file_input';
import { useParseFileInput } from '../../../../../../../common/hooks/use_parse_file_input';
import * as i18n from './translations';
import type { SplunkDashboardsResult } from '../../../../types';

export interface DashboardsFileUploadProps {
  isLoading: boolean;
  isCreated: boolean;
  onDashboardsFileChanged?: (files: FileList | null) => void;
  migrationName: string | undefined;
  apiError: string | undefined;
  onFileUpload?: (dashboards: SplunkDashboardsResult[]) => void;
}
export const DashboardsFileUpload = React.memo<DashboardsFileUploadProps>(
  ({ migrationName, apiError, isLoading, isCreated, onDashboardsFileChanged, onFileUpload }) => {
    const [, setUploadedDashboards] = useState<SplunkDashboardsResult[]>([]);
    const filePickerRef = useRef<EuiFilePickerClass>(null);

    const onFileParsed = useCallback(
      (content: Array<SplunkRow<SplunkDashboardsResult>>) => {
        const dashboards = content.map(formatDashboardRow);
        setUploadedDashboards(dashboards);
        onFileUpload?.(dashboards);
      },
      [onFileUpload]
    );

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
              aria-label="Upload rules file"
              isLoading={showLoader}
              disabled={isDisabled}
              data-test-subj="rulesFilePicker"
              data-loading={isParsing}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
DashboardsFileUpload.displayName = 'DashboardsFileUpload';

const formatDashboardRow = (row: SplunkRow<SplunkDashboardsResult>): SplunkDashboardsResult => {
  if (!isPlainObject(row.result)) {
    throw new Error(FILE_UPLOAD_ERROR.NOT_OBJECT);
  }
  // rule document format validation delegated to API
  return row.result;
};

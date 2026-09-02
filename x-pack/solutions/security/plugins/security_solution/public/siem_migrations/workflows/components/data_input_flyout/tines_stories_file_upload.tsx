/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
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
import { z } from '@kbn/zod/v4';
import { TinesStoryExportSchema } from '../../../../../common/siem_migrations/parsers/tines';
import type { CreateWorkflowMigrationWorkflowsRequestBody } from '../../../../../common/siem_migrations/workflows/types';
import { FILE_UPLOAD_ERROR } from '../../../common/translations/file_upload_error';
import type { CreateMigration } from '../../service/hooks/use_create_migration';
import * as i18n from './translations';

const StoriesSchema = z.union([TinesStoryExportSchema, z.array(TinesStoryExportSchema).min(1)]);

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string | undefined;
      if (content == null) {
        reject(new Error(FILE_UPLOAD_ERROR.CAN_NOT_READ));
        return;
      }
      if (content === '' && e.loaded > 100000) {
        reject(new Error(FILE_UPLOAD_ERROR.TOO_LARGE_TO_PARSE));
        return;
      }
      resolve(content);
    };
    reader.onerror = () => {
      const message = reader.error?.message;
      reject(
        new Error(
          message
            ? FILE_UPLOAD_ERROR.CAN_NOT_READ_WITH_REASON(message)
            : FILE_UPLOAD_ERROR.CAN_NOT_READ
        )
      );
    };
    reader.readAsText(file);
  });

const parseStoriesContent = (content: string): CreateWorkflowMigrationWorkflowsRequestBody => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(FILE_UPLOAD_ERROR.INVALID_JSON);
  }
  const result = StoriesSchema.safeParse(parsed);
  if (!result.success) {
    const reason = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${path}${issue.message}`;
      })
      .join('; ');
    throw new Error(
      reason
        ? FILE_UPLOAD_ERROR.INVALID_TINES_STORY_WITH_REASON(reason)
        : FILE_UPLOAD_ERROR.INVALID_TINES_STORY
    );
  }
  return Array.isArray(result.data) ? result.data : [result.data];
};

export interface TinesStoriesFileUploadProps {
  createMigration: CreateMigration;
  migrationName: string | undefined;
  isLoading: boolean;
  isCreated: boolean;
  apiError: string | undefined;
}

export const TinesStoriesFileUpload = React.memo<TinesStoriesFileUploadProps>(
  ({ createMigration, migrationName, isLoading, isCreated, apiError }) => {
    const [storiesToUpload, setStoriesToUpload] =
      useState<CreateWorkflowMigrationWorkflowsRequestBody>();
    const [isParsing, setIsParsing] = useState(false);
    const [fileError, setFileError] = useState<string>();
    const filePickerRef = useRef<EuiFilePickerClass>(null);

    const onFileChange = useCallback((files: FileList | null) => {
      setStoriesToUpload(undefined);
      setFileError(undefined);

      if (!files || files.length === 0) {
        return;
      }

      setIsParsing(true);
      void (async () => {
        try {
          const contents = await Promise.all(
            Array.from(files).map((file) => readFileAsText(file))
          );
          const stories = contents.flatMap(parseStoriesContent);
          if (stories.length === 0) {
            throw new Error(FILE_UPLOAD_ERROR.EMPTY);
          }
          setStoriesToUpload(stories);
        } catch (err) {
          setFileError(err instanceof Error ? err.message : FILE_UPLOAD_ERROR.CAN_NOT_PARSE);
        } finally {
          setIsParsing(false);
        }
      })();
    }, []);

    const onSubmit = useCallback(() => {
      if (!migrationName || !storiesToUpload) {
        return;
      }
      filePickerRef.current?.removeFiles();
      createMigration(migrationName, storiesToUpload);
    }, [createMigration, migrationName, storiesToUpload]);

    const validationError = useMemo(() => apiError ?? fileError, [apiError, fileError]);
    const showLoader = isParsing || isLoading;
    const isButtonDisabled = !migrationName || showLoader || isCreated || storiesToUpload == null;

    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="s">{i18n.DATA_INPUT_FLYOUT_UPLOAD_DESCRIPTION}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow isInvalid={validationError != null} fullWidth error={validationError}>
            <EuiFilePicker
              isInvalid={validationError != null}
              id="tinesStoriesFilePicker"
              ref={filePickerRef as React.Ref<Omit<EuiFilePickerProps, 'stylesMemoizer'>>}
              fullWidth
              initialPromptText={
                <EuiText size="s" textAlign="center">
                  {i18n.DATA_INPUT_FLYOUT_UPLOAD_PROMPT}
                </EuiText>
              }
              accept=".json"
              onChange={onFileChange}
              display="large"
              aria-label={i18n.DATA_INPUT_FLYOUT_UPLOAD_PROMPT}
              isLoading={showLoader}
              disabled={showLoader || isCreated}
              multiple
              data-test-subj="tinesStoriesFilePicker"
              data-loading={isParsing}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiButton
                color="success"
                onClick={onSubmit}
                isLoading={showLoader}
                disabled={isButtonDisabled}
                data-test-subj="uploadTinesStoriesButton"
              >
                {i18n.DATA_INPUT_FLYOUT_UPLOAD_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
TinesStoriesFileUpload.displayName = 'TinesStoriesFileUpload';

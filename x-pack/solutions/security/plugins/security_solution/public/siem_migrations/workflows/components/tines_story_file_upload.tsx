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
import { TinesStoryExportSchema } from '../../../../common/siem_migrations/parsers/tines';
import type { TranslateWorkflowRequestBody } from '../../../../common/siem_migrations/workflows/types';
import { useParseFileInput } from '../../common/hooks/use_parse_file_input';
import { FILE_UPLOAD_ERROR } from '../../common/translations/file_upload_error';
import * as i18n from '../pages/translations';

export interface TinesStoryFileUploadProps {
  isLoading: boolean;
  apiError: string | undefined;
  onTranslate: (story: TranslateWorkflowRequestBody['story']) => void;
}

export const TinesStoryFileUpload = React.memo<TinesStoryFileUploadProps>(
  ({ isLoading, apiError, onTranslate }) => {
    const [storyToUpload, setStoryToUpload] = useState<TranslateWorkflowRequestBody['story']>();
    const filePickerRef = useRef<EuiFilePickerClass>(null);

    const onJsonFileParsed = useCallback((content: string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error(FILE_UPLOAD_ERROR.INVALID_JSON);
      }
      const result = TinesStoryExportSchema.safeParse(parsed);
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
      setStoryToUpload(result.data);
    }, []);

    const { parseFile, isParsing, error: fileError } = useParseFileInput(onJsonFileParsed);

    const onFileChange = useCallback(
      (files: FileList | null) => {
        setStoryToUpload(undefined);
        parseFile(files);
      },
      [parseFile]
    );

    const onSubmit = useCallback(() => {
      if (!storyToUpload) {
        return;
      }
      filePickerRef.current?.removeFiles();
      onTranslate(storyToUpload);
    }, [onTranslate, storyToUpload]);

    const validationError = useMemo(() => apiError ?? fileError, [apiError, fileError]);
    const showLoader = isParsing || isLoading;
    const isButtonDisabled = showLoader || storyToUpload === undefined;

    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="s">{i18n.UPLOAD_DESCRIPTION}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow isInvalid={validationError != null} fullWidth error={validationError}>
            <EuiFilePicker
              isInvalid={validationError != null}
              id="tinesStoryFilePicker"
              ref={filePickerRef as React.Ref<Omit<EuiFilePickerProps, 'stylesMemoizer'>>}
              fullWidth
              initialPromptText={
                <EuiText size="s" textAlign="center">
                  {i18n.UPLOAD_PROMPT}
                </EuiText>
              }
              accept=".json"
              onChange={onFileChange}
              display="large"
              aria-label={i18n.UPLOAD_ARIA_LABEL}
              isLoading={showLoader}
              disabled={showLoader}
              data-test-subj="tinesStoryFilePicker"
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
                data-test-subj="translateTinesStoryButton"
              >
                {i18n.TRANSLATE_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
TinesStoryFileUpload.displayName = 'TinesStoryFileUpload';

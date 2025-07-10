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
import type { RuleMigrationResourceData } from '../../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { FILE_UPLOAD_ERROR } from '../../../../translations';
import * as i18n from './translations';
import { UploadFileButton } from '../../../common/upload_file_button';

export interface LookupsFileUploadProps {
  createResources: (resources: RuleMigrationResourceData[]) => void;
  apiError?: string;
  isLoading?: boolean;
}
export const LookupsFileUpload = React.memo<LookupsFileUploadProps>(
  ({ createResources, apiError, isLoading }) => {
    const [lookupResources, setLookupResources] = useState<RuleMigrationResourceData[]>([]);
    const filePickerRef = useRef<EuiFilePickerClass>(null);

    const createLookups = useCallback(() => {
      filePickerRef.current?.removeFiles();
      createResources(lookupResources);
    }, [createResources, lookupResources]);

    const [isParsing, setIsParsing] = useState<boolean>(false);
    const [fileErrors, setErrors] = useState<string[]>([]);
    const addError = useCallback((error: string) => {
      setErrors((current) => [...current, error]);
    }, []);

    const parseFile = useCallback(
      async (files: FileList | null) => {
        setErrors([]);
        setLookupResources([]);

        if (!files?.length) {
          return;
        }

        const lookups = await Promise.all(
          Array.from(files).map((file) => {
            return new Promise<RuleMigrationResourceData>((resolve) => {
              const reader = new FileReader();

              reader.onloadstart = () => setIsParsing(true);
              reader.onloadend = () => setIsParsing(false);

              reader.onload = function (e) {
                // We can safely cast to string since we call `readAsText` to load the file.
                const content = e.target?.result as string | undefined;

                if (content == null) {
                  addError(FILE_UPLOAD_ERROR.CAN_NOT_READ);
                  return;
                }

                if (content === '' && e.loaded > 100000) {
                  // V8-based browsers can't handle large files and return an empty string
                  // instead of an error; see https://stackoverflow.com/a/61316641
                  addError(FILE_UPLOAD_ERROR.TOO_LARGE_TO_PARSE);
                  return;
                }

                const name = file.name.replace(/\.[^/.]+$/, '').trim();
                resolve({ type: 'lookup', name, content });
              };

              const handleReaderError = function () {
                const message = reader.error?.message;
                if (message) {
                  addError(FILE_UPLOAD_ERROR.CAN_NOT_READ_WITH_REASON(message));
                } else {
                  addError(FILE_UPLOAD_ERROR.CAN_NOT_READ);
                }
              };

              reader.onerror = handleReaderError;
              reader.onabort = handleReaderError;

              reader.readAsText(file);
            });
          })
        ).catch((e) => {
          addError(e.message);
          return [];
        });
        // Set the loaded lookups to the state
        setLookupResources((current) => [...current, ...lookups]);
      },
      [addError]
    );

    const errors = useMemo(() => {
      if (apiError) {
        return [apiError];
      }
      return fileErrors;
    }, [apiError, fileErrors]);

    const showLoader = isParsing || isLoading;
    const isButtonDisabled = showLoader || lookupResources.length === 0;

    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow
            helpText={errors.map((error) => (
              <EuiText color="danger" size="xs">
                {error}
              </EuiText>
            ))}
            isInvalid={errors.length > 0}
            fullWidth
          >
            <EuiFilePicker
              id="lookupsFilePicker"
              ref={filePickerRef as React.Ref<Omit<EuiFilePickerProps, 'stylesMemoizer'>>}
              fullWidth
              initialPromptText={
                <EuiText size="s" textAlign="center">
                  {i18n.LOOKUPS_DATA_INPUT_FILE_UPLOAD_PROMPT}
                </EuiText>
              }
              accept="application/text"
              onChange={parseFile}
              multiple
              display="large"
              aria-label="Upload lookups files"
              isLoading={showLoader}
              disabled={showLoader}
              data-test-subj="lookupsFilePicker"
              data-loading={isParsing}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
            <EuiFlexItem grow={false}>
              <UploadFileButton
                onClick={createLookups}
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
LookupsFileUpload.displayName = 'LookupsFileUpload';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useRef } from 'react';
import { isPlainObject } from 'lodash';
import { EuiFilePicker, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiText } from '@elastic/eui';
import type {
  EuiFilePickerClass,
  EuiFilePickerProps,
} from '@elastic/eui/src/components/form/file_picker/file_picker';
import { UploadFileButton } from '../../../../../../../common/components/migration_steps';
import { FILE_UPLOAD_ERROR } from '../../../../../../../common/translations/file_upload_error';
import {
  parseContent,
  useParseFileInput,
  type SplunkRow,
} from '../../../../../../../common/hooks/use_parse_file_input';
import type { SiemMigrationResourceData } from '../../../../../../../../../common/siem_migrations/model/common.gen';
import type { SPLUNK_MACROS_COLUMNS } from '../../../../constants';
import * as i18n from './translations';

type SplunkMacroResult = Partial<Record<(typeof SPLUNK_MACROS_COLUMNS)[number], string>>;

export interface MacrosFileUploadProps {
  createResources: (resources: SiemMigrationResourceData[]) => void;
  apiError?: string;
  isLoading?: boolean;
}
export const MacrosFileUpload = React.memo<MacrosFileUploadProps>(
  ({ createResources, apiError, isLoading }) => {
    const [macrosToUpload, setMacrosToUpload] = useState<SiemMigrationResourceData[]>([]);
    const filePickerRef = useRef<EuiFilePickerClass>(null);

    const createMacros = useCallback(() => {
      filePickerRef.current?.removeFiles();
      createResources(macrosToUpload);
    }, [createResources, macrosToUpload]);

    const onFileParsed = useCallback((content: string) => {
      const macros = parseContent(content).map(formatMacroRow);
      setMacrosToUpload(macros);
    }, []);

    const { parseFile, isParsing, error: fileError } = useParseFileInput(onFileParsed);

    const onFileChange = useCallback(
      (files: FileList | null) => {
        setMacrosToUpload([]);
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
    const isButtonDisabled = showLoader || macrosToUpload.length === 0;

    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow
            helpText={
              <EuiText color="danger" size="xs" data-test-subj="macrosFileUploadError">
                {error}
              </EuiText>
            }
            isInvalid={error != null}
            fullWidth
          >
            <EuiFilePicker
              isInvalid={error != null}
              id="macrosFilePicker"
              ref={filePickerRef as React.Ref<Omit<EuiFilePickerProps, 'stylesMemoizer'>>}
              fullWidth
              initialPromptText={
                <EuiText size="s" textAlign="center">
                  {i18n.MACROS_DATA_INPUT_FILE_UPLOAD_PROMPT}
                </EuiText>
              }
              accept="application/json, application/x-ndjson"
              onChange={onFileChange}
              display="large"
              aria-label="Upload macros file"
              isLoading={showLoader}
              disabled={showLoader}
              data-test-subj="macrosFilePicker"
              data-loading={isParsing}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
            <EuiFlexItem grow={false} data-test-subj="macrosUploadFileButton">
              <UploadFileButton
                onClick={createMacros}
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
MacrosFileUpload.displayName = 'MacrosFileUpload';

const formatMacroRow = (row: SplunkRow<SplunkMacroResult>): SiemMigrationResourceData => {
  if (!isPlainObject(row.result)) {
    throw new Error(FILE_UPLOAD_ERROR.NOT_OBJECT);
  }
  const macroResource: Partial<SiemMigrationResourceData> = {
    type: 'macro',
    name: row.result.title,
    content: row.result.definition,
  };
  // resource document format validation delegated to API
  return macroResource as SiemMigrationResourceData;
};

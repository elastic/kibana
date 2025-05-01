/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiFilePickerProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFilePicker,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';

import { useAppToasts } from '../../hooks/use_app_toasts';
import * as i18n from './translations';

interface ImportDataModalProps<T> {
  isModalVisible: boolean;
  closeModal: () => void;
  title: string;
  filePickerPrompt: string;
  description: string;
  submitBtnText: string;
  errorMessage: (totalCount: number) => string;
  importData: (arg: { fileToImport: File; signal: AbortSignal }) => Promise<T>;
  onImportComplete: (importResult: T) => void;
  children?: React.ReactNode;
}

export const ImportDataModalComponent = <T,>({
  isModalVisible,
  closeModal,
  title,
  filePickerPrompt,
  description,
  submitBtnText,
  errorMessage,
  importData,
  onImportComplete,
  children,
}: ImportDataModalProps<T>) => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const { addError } = useAppToasts();

  const descriptionElementId = useMemo(() => htmlIdGenerator()(), []);

  const cleanupAndCloseModal = useCallback(() => {
    closeModal();
    setIsImporting(false);
    setSelectedFiles(null);
  }, [closeModal]);

  const importDataCallback = useCallback(async () => {
    if (selectedFiles != null) {
      setIsImporting(true);
      const abortCtrl = new AbortController();

      try {
        const importResponse = await importData({
          fileToImport: selectedFiles[0],
          signal: abortCtrl.signal,
        });

        setIsImporting(false);
        setSelectedFiles(null);

        onImportComplete(importResponse);
      } catch (error) {
        cleanupAndCloseModal();
        addError(error, { title: errorMessage(1) });
      }
    }
  }, [selectedFiles, importData, errorMessage, addError, onImportComplete, cleanupAndCloseModal]);

  const handleFilePickerChange: EuiFilePickerProps['onChange'] = useCallback(
    (files: FileList | null) => {
      setSelectedFiles(files && files.length > 0 ? files : null);
    },
    []
  );

  return (
    <>
      {isModalVisible && (
        <EuiModal onClose={cleanupAndCloseModal} maxWidth={'750px'}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiText size="s">
              <h4 id={descriptionElementId}>{description}</h4>
            </EuiText>

            <EuiSpacer size="s" />
            <EuiFilePicker
              data-test-subj="rule-file-picker"
              accept=".ndjson"
              id="rule-file-picker"
              initialPromptText={filePickerPrompt}
              onChange={handleFilePickerChange}
              display={'large'}
              fullWidth={true}
              isLoading={isImporting}
              aria-labelledby={descriptionElementId}
            />
            <EuiSpacer size="s" />
            {children}
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={cleanupAndCloseModal}>{i18n.CANCEL_BUTTON}</EuiButtonEmpty>
            <EuiButton
              data-test-subj="import-data-modal-button"
              onClick={importDataCallback}
              disabled={selectedFiles == null || isImporting}
              fill
            >
              {submitBtnText}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};

ImportDataModalComponent.displayName = 'ImportDataModalComponent';

export const ImportDataModal = React.memo(
  ImportDataModalComponent
) as typeof ImportDataModalComponent;

ImportDataModal.displayName = 'ImportDataModal';

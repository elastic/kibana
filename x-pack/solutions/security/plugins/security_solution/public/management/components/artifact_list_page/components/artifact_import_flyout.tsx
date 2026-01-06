/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFilePickerProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { useToasts } from '../../../../common/lib/kibana';
import type { ArtifactListPageLabels } from '../translations';
import { useImportArtifactList } from '../../../hooks/artifacts/use_import_artifact_list';
import type { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

export interface ArtifactImportFlyoutProps {
  onCancel: () => void;
  onSuccess: () => void;
  apiClient: ExceptionsListApiClient;
  labels: ArtifactListPageLabels;
  'data-test-subj'?: string;
}

export const ArtifactImportFlyout: React.FC<ArtifactImportFlyoutProps> = ({
  onCancel,
  onSuccess,
  apiClient,
  labels,
  'data-test-subj': dataTestSubj = 'artifactImportFlyout',
}) => {
  const toasts = useToasts();
  const getTestId = useTestIdGenerator(dataTestSubj);

  const [file, setFile] = React.useState<File | null>(null);

  const { isLoading, mutate } = useImportArtifactList(apiClient);

  const handleOnCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const handleOnSubmit = useCallback(() => {
    if (file !== null) {
      mutate(
        { file },
        {
          onError: (error) => {
            toasts.addError(error, { title: labels.pageImportErrorToastTitle });
          },
          onSuccess: (response) => {
            // todo: response contains lot of useful information, show somewhere?
            toasts.addSuccess(labels.pageImportSuccessToastTitle);
            onSuccess();
          },
        }
      );
    }
  }, [
    file,
    labels.pageImportErrorToastTitle,
    labels.pageImportSuccessToastTitle,
    mutate,
    onSuccess,
    toasts,
  ]);

  const handleOnFileChange: EuiFilePickerProps['onChange'] = useCallback(
    (files: FileList | null) => {
      if (files && files.length > 0) {
        setFile(files[0]);
      } else {
        setFile(null);
      }
    },
    []
  );

  const importEndpointArtifactListFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'importEndpointArtifactListFlyoutTitleId',
  });

  return (
    <EuiFlyout
      ownFocus
      size="s"
      onClose={handleOnCancel}
      aria-labelledby={importEndpointArtifactListFlyoutTitleId}
      data-test-subj={getTestId()}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={importEndpointArtifactListFlyoutTitleId}>{labels.pageImportButtonTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFilePicker
          onChange={handleOnFileChange}
          disabled={isLoading}
          data-test-subj={getTestId('filePicker')}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty onClick={handleOnCancel} data-test-subj={getTestId('cancelButton')}>
            {labels.flyoutCancelButtonLabel}
          </EuiButtonEmpty>

          <EuiButton
            onClick={handleOnSubmit}
            disabled={file === null}
            isLoading={isLoading}
            data-test-subj={getTestId('importButton')}
          >
            {labels.pageImportButtonTitle}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

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
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { BulkErrorSchema } from '@kbn/securitysolution-io-ts-list-types';
import { parseListIdsFromImportedFile } from '../../../../common/utils/exception_list_items';
import { useKibana, useToasts } from '../../../../common/lib/kibana';
import type { artifactListPageLabels } from '../translations';
import { useImportArtifactList } from '../../../hooks/artifacts/use_import_artifact_list';
import type { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { ArtifactImportConfirmModal } from './artifact_import_confirm_modal';

export interface ArtifactImportFlyoutProps {
  onCancel: () => void;
  onSuccess: () => void;
  onShowErrors: (errors: BulkErrorSchema[]) => void;
  apiClient: ExceptionsListApiClient;
  labels: typeof artifactListPageLabels;
  'data-test-subj'?: string;
}

const ArtifactImportErrorToast: React.FC<{
  text: string;
  buttonLabel: string;
  errors: BulkErrorSchema[];
  onShowErrors: (errors: BulkErrorSchema[]) => void;
}> = ({ text, buttonLabel, errors, onShowErrors }) => {
  const handleOnClick = useCallback(() => {
    onShowErrors(errors);
  }, [errors, onShowErrors]);

  return (
    <>
      <EuiText size="s">{text}</EuiText>

      <EuiFlexGroup justifyContent="flexEnd" direction="row">
        <EuiButton size="s" onClick={handleOnClick}>
          {buttonLabel}
        </EuiButton>
      </EuiFlexGroup>
    </>
  );
};

export const ArtifactImportFlyout: React.FC<ArtifactImportFlyoutProps> = ({
  onCancel,
  onSuccess,
  onShowErrors,
  apiClient,
  labels,
  'data-test-subj': dataTestSubj = 'artifactImportFlyout',
}) => {
  const toasts = useToasts();
  const services = useKibana().services;
  const getTestId = useTestIdGenerator(dataTestSubj);

  const [file, setFile] = React.useState<File | null>(null);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);

  const { isLoading, mutate } = useImportArtifactList(apiClient);

  const handleOnSubmit = useCallback(() => {
    setShowConfirmModal(true);
  }, []);

  const handleOnCancelModal = useCallback(() => {
    setShowConfirmModal(false);
  }, []);

  const handleOnConfirmModal = useCallback(async () => {
    if (file !== null) {
      const listIds = await parseListIdsFromImportedFile(file);

      if (listIds.size > 1 || !listIds.has(apiClient.listId)) {
        toasts.addDanger({
          title: labels.pageImportErrorToastTitle,
          text: labels.pageImportOnlyCurrentArtifactCanBeImportedError,
        });
        setShowConfirmModal(false);

        return;
      }

      mutate(
        { file },
        {
          onError: (error) => {
            toasts.addError(error, {
              title: labels.pageImportErrorToastTitle,
              toastMessage: error.body?.message || error.message,
            });
            setShowConfirmModal(false);
          },
          onSuccess: (response) => {
            if (response.success_exception_list_items === true) {
              toasts.addSuccess({
                title: labels.pageImportSuccessToastTitle,
                text: labels.pageImportSuccessToastText,
                toastLifeTimeMs: 60_000,
              });
            } else {
              const itemErrors: BulkErrorSchema[] = response.errors.filter(
                (error) =>
                  !(
                    error.error.status_code === 409 &&
                    error.error.message.match(/Found that list_id: "\w+" already exists/)
                  )
              );

              if (itemErrors.length > 0 && response.success_count_exception_list_items > 0) {
                toasts.addWarning({
                  title: labels.pageImportCompletedWithErrorsToastTitle,
                  toastLifeTimeMs: 60_000,
                  text: toMountPoint(
                    <ArtifactImportErrorToast
                      text={labels.getPageImportCompletedWithErrorsToastText(
                        response.success_count_exception_list_items,
                        itemErrors.length
                      )}
                      buttonLabel={labels.pageImportViewErrorsButton}
                      errors={itemErrors}
                      onShowErrors={onShowErrors}
                    />,
                    services
                  ),
                });
              }

              if (itemErrors.length > 0 && response.success_count_exception_list_items === 0) {
                toasts.addDanger({
                  title: labels.pageImportErrorToastTitle,
                  toastLifeTimeMs: 60_000,
                  text: toMountPoint(
                    <ArtifactImportErrorToast
                      text={labels.pageImportAllItemsFailedToastText}
                      buttonLabel={labels.pageImportViewErrorsButton}
                      errors={itemErrors}
                      onShowErrors={onShowErrors}
                    />,
                    services
                  ),
                });
              }
            }

            setShowConfirmModal(false);
            onSuccess();
          },
        }
      );
    }
  }, [apiClient.listId, file, labels, mutate, onShowErrors, onSuccess, services, toasts]);

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
      onClose={onCancel}
      aria-labelledby={importEndpointArtifactListFlyoutTitleId}
      data-test-subj={getTestId()}
    >
      {showConfirmModal && (
        <ArtifactImportConfirmModal
          onCancel={handleOnCancelModal}
          onConfirm={handleOnConfirmModal}
          isLoading={isLoading}
          data-test-subj={getTestId('confirmModal')}
        />
      )}

      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={importEndpointArtifactListFlyoutTitleId}>{labels.pageImportButtonTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiText color="subdued" size="s">
          <p>{labels.importFlyoutDetails}</p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFilePicker
          onChange={handleOnFileChange}
          disabled={isLoading}
          data-test-subj={getTestId('filePicker')}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty onClick={onCancel} data-test-subj={getTestId('cancelButton')}>
            {labels.flyoutCancelButtonLabel}
          </EuiButtonEmpty>

          <EuiButton
            onClick={handleOnSubmit}
            disabled={file === null}
            isLoading={isLoading}
            data-test-subj={getTestId('importButton')}
          >
            {labels.importFlyoutImportSubmitButtonLabel}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

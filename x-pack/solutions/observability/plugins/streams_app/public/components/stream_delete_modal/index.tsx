/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';

export function StreamDeleteModal({
  closeModal,
  clearChildUnderEdit,
  refreshDefinition,
  id,
}: {
  closeModal: () => void;
  clearChildUnderEdit: () => void;
  refreshDefinition: () => void;
  id: string;
}) {
  const {
    core: { notifications },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const abortController = useAbortController();
  const [deleteInProgress, setDeleteInProgress] = React.useState(false);
  const modalTitleId = useGeneratedHtmlId();
  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.streams.streamDetailRouting.deleteModalTitle', {
            defaultMessage: 'Are you sure you want to delete this data stream?',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText>
          {i18n.translate('xpack.streams.streamDetailRouting.deleteModalDescription', {
            defaultMessage:
              'Deleting this stream will remove all of its children and the data will no longer be routed. All existing data will be removed as well.',
          })}
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiButtonEmpty
            data-test-subj="streamsAppStreamDetailRoutingCancelButton"
            onClick={closeModal}
          >
            {i18n.translate('xpack.streams.streamDetailRouting.deleteModalCancel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
          <EuiButton
            data-test-subj="streamsAppStreamDetailRoutingDeleteButton"
            color="danger"
            fill
            onClick={async () => {
              try {
                setDeleteInProgress(true);
                await streamsRepositoryClient.fetch('DELETE /api/streams/{id}', {
                  signal: abortController.signal,
                  params: {
                    path: {
                      id,
                    },
                  },
                });
                setDeleteInProgress(false);
                notifications.toasts.addSuccess({
                  title: i18n.translate('xpack.streams.streamDetailRouting.deleted', {
                    defaultMessage: 'Stream deleted',
                  }),
                });
                clearChildUnderEdit();
                closeModal();
                refreshDefinition();
              } catch (error) {
                setDeleteInProgress(false);
                notifications.toasts.addError(error, {
                  title: i18n.translate('xpack.streams.failedToDelete', {
                    defaultMessage: 'Failed to delete stream {id}',
                    values: {
                      id,
                    },
                  }),
                });
              }
            }}
            isLoading={deleteInProgress}
          >
            {i18n.translate('xpack.streams.streamDetailRouting.delete', {
              defaultMessage: 'Delete',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}

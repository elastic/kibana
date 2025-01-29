/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  useGeneratedHtmlId,
  EuiButton,
  EuiConfirmModal,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';

export const DangerZone = ({
  onDeleteProcessor,
}: Pick<DeleteProcessorButtonProps, 'onDeleteProcessor'>) => {
  return (
    <EuiPanel hasShadow={false} paddingSize="none">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.dangerAreaTitle',
            { defaultMessage: 'Danger area' }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer />
      <DeleteProcessorButton onDeleteProcessor={onDeleteProcessor} />
    </EuiPanel>
  );
};

interface DeleteProcessorButtonProps {
  onDeleteProcessor: () => void;
}

const DeleteProcessorButton = ({ onDeleteProcessor }: DeleteProcessorButtonProps) => {
  const [isConfirmModalOpen, { on: openConfirmModal, off: closeConfirmModal }] = useBoolean();
  const confirmModalId = useGeneratedHtmlId();

  return (
    <>
      <EuiButton
        data-test-subj="streamsAppDeleteProcessorButtonDeleteProcessorButton"
        color="danger"
        onClick={openConfirmModal}
      >
        {i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.dangerAreaTitle',
          { defaultMessage: 'Delete processor' }
        )}
      </EuiButton>
      {isConfirmModalOpen && (
        <EuiConfirmModal
          aria-labelledby={confirmModalId}
          title={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.deleteProcessorModalTitle',
            { defaultMessage: 'Delete processor' }
          )}
          titleProps={{ id: confirmModalId }}
          onCancel={closeConfirmModal}
          onConfirm={onDeleteProcessor}
          cancelButtonText={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.deleteProcessorModalCancel',
            { defaultMessage: 'Keep processor' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.deleteProcessorModalConfirm',
            { defaultMessage: 'Delete processor' }
          )}
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.deleteProcessorModalBody',
              {
                defaultMessage:
                  'You can still reset this until the changes are confirmed on the processors list.',
              }
            )}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};

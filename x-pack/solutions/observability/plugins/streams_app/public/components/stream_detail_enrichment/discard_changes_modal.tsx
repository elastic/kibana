/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface DiscardChangesModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export function DiscardChangesModal({ onConfirm, onCancel }: DiscardChangesModalProps) {
  const discardModalId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={discardModalId}
      title={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.discardModalTitle',
        { defaultMessage: 'Discard in progress changes' }
      )}
      titleProps={{ id: discardModalId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.discardModalCancel',
        { defaultMessage: 'Keep editing' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.discardModalConfirm',
        { defaultMessage: 'Discard work in progress' }
      )}
      buttonColor="danger"
      defaultFocusedButton="confirm"
    >
      <p>
        {i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.discardModalBody',
          { defaultMessage: 'You will lose all unsaved work in progress.' }
        )}
      </p>
    </EuiConfirmModal>
  );
}

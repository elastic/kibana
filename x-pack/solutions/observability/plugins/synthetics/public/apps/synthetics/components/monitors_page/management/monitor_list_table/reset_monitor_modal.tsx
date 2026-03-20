/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { kibanaService } from '../../../../../../utils/kibana_service';

export const ResetMonitorModal = ({
  configIds,
  onClose,
  resetMonitors,
}: {
  configIds: string[];
  onClose: () => void;
  resetMonitors: (ids: string[]) => Promise<{ error?: Error }>;
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const modalTitleId = useGeneratedHtmlId();

  const handleConfirm = useCallback(async () => {
    setIsResetting(true);
    const { error } = await resetMonitors(configIds);
    setIsResetting(false);
    if (!error) {
      kibanaService.toasts.addSuccess({
        title: i18n.translate('xpack.synthetics.resetMonitorModal.success', {
          defaultMessage: '{count, plural, one {# monitor} other {# monitors}} reset successfully',
          values: { count: configIds.length },
        }),
        toastLifeTimeMs: 3000,
      });
    } else {
      kibanaService.toasts.addDanger({
        title: i18n.translate('xpack.synthetics.resetMonitorModal.error', {
          defaultMessage: 'Failed to reset monitors',
        }),
        toastLifeTimeMs: 5000,
      });
    }
    onClose();
  }, [configIds, onClose, resetMonitors]);

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={i18n.translate('xpack.synthetics.resetMonitorModal.title', {
        defaultMessage: 'Reset {count, number} {count, plural, one {monitor} other {monitors}}?',
        values: { count: configIds.length },
      })}
      titleProps={{ id: modalTitleId }}
      onCancel={onClose}
      onConfirm={handleConfirm}
      cancelButtonText={CANCEL_LABEL}
      confirmButtonText={CONFIRM_LABEL}
      buttonColor="warning"
      defaultFocusedButton="confirm"
      isLoading={isResetting}
    >
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.synthetics.resetMonitorModal.description', {
            defaultMessage:
              'This will recreate the Fleet integration for the selected monitors. They should start running again shortly after.',
          })}
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
};

const CANCEL_LABEL = i18n.translate('xpack.synthetics.resetMonitorModal.cancel', {
  defaultMessage: 'Cancel',
});

const CONFIRM_LABEL = i18n.translate('xpack.synthetics.resetMonitorModal.confirm', {
  defaultMessage: 'Reset',
});

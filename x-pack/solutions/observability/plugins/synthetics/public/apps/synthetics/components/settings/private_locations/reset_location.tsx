/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiConfirmModal, EuiToolTip, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux';
import { selectPrivateLocationsState } from '../../../state/private_locations/selectors';
import { useSyntheticsSettingsContext } from '../../../contexts';

export const ResetLocation = ({
  id,
  label,
  locationMonitors,
  onReset,
}: {
  id: string;
  label: string;
  onReset: (id: string) => void;
  locationMonitors: Array<{ id: string; count: number }>;
}) => {
  const monCount = locationMonitors?.find((l) => l.id === id)?.count ?? 0;
  const canReset = monCount > 0;
  const { loading, resetLoading } = useSelector(selectPrivateLocationsState);

  const { canSave } = useSyntheticsSettingsContext();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const resetDisabledReason = i18n.translate(
    'xpack.synthetics.monitorManagement.cannotReset.description',
    {
      defaultMessage: 'Location has no monitors to reset.',
    }
  );

  const confirmModalTitleId = useGeneratedHtmlId();

  const deleteModal = (
    <EuiConfirmModal
      aria-labelledby={confirmModalTitleId}
      title={i18n.translate('xpack.synthetics.monitorManagement.resetLocationName', {
        defaultMessage: 'Reset "{location}"',
        values: { location: label },
      })}
      titleProps={{ id: confirmModalTitleId }}
      onCancel={() => setIsModalOpen(false)}
      onConfirm={() => onReset(id)}
      cancelButtonText={CANCEL_LABEL}
      confirmButtonText={RESET_LABEL}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      isLoading={loading}
    >
      <p>{ARE_YOU_SURE_LABEL}</p>
    </EuiConfirmModal>
  );

  return (
    <>
      {isModalOpen && deleteModal}
      <EuiToolTip content={canReset ? RESET_LABEL : resetDisabledReason}>
        <EuiButtonEmpty
          data-test-subj={`deleteLocation-${id}`}
          isLoading={resetLoading}
          iconType="refresh"
          color="success"
          aria-label={RESET_LABEL}
          onClick={() => {
            setIsModalOpen(true);
          }}
          isDisabled={!canReset || !canSave}
        >
          {RESET_LABEL}
        </EuiButtonEmpty>
      </EuiToolTip>
    </>
  );
};

const RESET_LABEL = i18n.translate('xpack.synthetics.monitorManagement.resetLocation', {
  defaultMessage: 'Reset location',
});

const CANCEL_LABEL = i18n.translate('xpack.synthetics.monitorManagement.cancelLabel', {
  defaultMessage: 'Cancel',
});

const ARE_YOU_SURE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.resetConfirmation', {
  defaultMessage:
    'Are you sure you want to reset this location? Monitors resources will be recreated. This will not deleted any existing data, only fleet resources will be reset.',
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux';
import { selectPrivateLocationsState } from '../../../state/private_locations/selectors';
import type { PrivateLocation } from '../../../../../../common/runtime_types';

export const ResetLocation = ({
  id,
  label,
  onReset,
  setIsModalOpen,
}: {
  id: string;
  label: string;
  onReset: (id: string) => void;
  setIsModalOpen: (isOpen: PrivateLocation | null) => void;
}) => {
  const confirmModalTitleId = useGeneratedHtmlId();
  const { resetLoading } = useSelector(selectPrivateLocationsState);
  return (
    <>
      <EuiConfirmModal
        aria-labelledby={confirmModalTitleId}
        title={i18n.translate('xpack.synthetics.monitorManagement.resetLocationName', {
          defaultMessage: 'Reset "{location}"',
          values: { location: label },
        })}
        titleProps={{ id: confirmModalTitleId }}
        onCancel={() => setIsModalOpen(null)}
        onConfirm={() => onReset(id)}
        cancelButtonText={CANCEL_LABEL}
        confirmButtonText={RESET_LABEL}
        buttonColor="danger"
        defaultFocusedButton="confirm"
        isLoading={resetLoading}
      >
        <p>{ARE_YOU_SURE_LABEL}</p>
      </EuiConfirmModal>
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
    'Are you sure you want to reset this location? Monitors resources will be recreated. This will not deleted any existing data, only fleet resources will be reset. This should be done when facing issues running monitors in a particular private location.',
});

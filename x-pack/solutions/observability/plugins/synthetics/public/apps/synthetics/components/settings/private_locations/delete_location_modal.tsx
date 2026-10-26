/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const DeleteLocationModal = ({
  locationId,
  loading,
  label,
  onDelete,
  onCancel,
}: {
  locationId: string;
  loading: boolean;
  label: string;
  onDelete: (id: string) => void;
  onCancel: () => void;
}) => {
  const confirmModalTitleId = useGeneratedHtmlId();

  const handleConfirmDelete = () => {
    if (locationId) {
      onDelete(locationId);
    }
  };

  return (
    <>
      <EuiConfirmModal
        aria-labelledby={confirmModalTitleId}
        title={i18n.translate('xpack.synthetics.monitorManagement.deleteLocationName', {
          defaultMessage: 'Delete "{location}"',
          values: { location: label },
        })}
        titleProps={{ id: confirmModalTitleId }}
        onCancel={onCancel}
        onConfirm={handleConfirmDelete}
        cancelButtonText={CANCEL_LABEL}
        confirmButtonText={CONFIRM_LABEL}
        buttonColor="danger"
        defaultFocusedButton="confirm"
        isLoading={loading}
      >
        <p>{ARE_YOU_SURE_LABEL}</p>
      </EuiConfirmModal>
    </>
  );
};

const CONFIRM_LABEL = i18n.translate('xpack.synthetics.monitorManagement.deleteLocationLabel', {
  defaultMessage: 'Delete location',
});

const CANCEL_LABEL = i18n.translate('xpack.synthetics.monitorManagement.cancelLabel', {
  defaultMessage: 'Cancel',
});

const ARE_YOU_SURE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.areYouSure', {
  defaultMessage: 'Are you sure you want to delete this location?',
});

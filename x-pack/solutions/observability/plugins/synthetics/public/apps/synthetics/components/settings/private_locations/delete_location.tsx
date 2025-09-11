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
import type { PrivateLocation } from '../../../../../../common/runtime_types';
import { selectPrivateLocationsState } from '../../../state/private_locations/selectors';

export const DeleteLocation = ({
  id,
  label,
  onDelete,
  setIsModalOpen,
}: {
  id: string;
  label: string;
  onDelete: (id: string) => void;
  setIsModalOpen: (isOpen: PrivateLocation | null) => void;
}) => {
  const { deleteLoading } = useSelector(selectPrivateLocationsState);

  const confirmModalTitleId = useGeneratedHtmlId();

  return (
    <>
      <EuiConfirmModal
        aria-labelledby={confirmModalTitleId}
        title={i18n.translate('xpack.synthetics.monitorManagement.deleteLocationName', {
          defaultMessage: 'Delete "{location}"',
          values: { location: label },
        })}
        titleProps={{ id: confirmModalTitleId }}
        onCancel={() => setIsModalOpen(null)}
        onConfirm={() => onDelete(id)}
        cancelButtonText={CANCEL_LABEL}
        confirmButtonText={DELETE_LABEL}
        buttonColor="danger"
        defaultFocusedButton="confirm"
        isLoading={deleteLoading}
      >
        <p>{ARE_YOU_SURE_LABEL}</p>
      </EuiConfirmModal>
    </>
  );
};

const DELETE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.deleteLocation', {
  defaultMessage: 'Delete location',
});

const CANCEL_LABEL = i18n.translate('xpack.synthetics.monitorManagement.cancelLabel', {
  defaultMessage: 'Cancel',
});

const ARE_YOU_SURE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.areYouSure', {
  defaultMessage: 'Are you sure you want to delete this location?',
});

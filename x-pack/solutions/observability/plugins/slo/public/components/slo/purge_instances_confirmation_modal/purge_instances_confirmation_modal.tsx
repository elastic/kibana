/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLODefinitionResponse } from '@kbn/slo-schema';
import React from 'react';
import { usePurgeInstances } from '../../../pages/slo_management/hooks/use_purge_instances';

interface Props {
  items?: SLODefinitionResponse[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function PurgeInstancesConfirmationModal({ items, onCancel, onConfirm }: Props) {
  const { mutate: purgeInstances } = usePurgeInstances();
  const modalTitleId = useGeneratedHtmlId();
  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      buttonColor="primary"
      data-test-subj="purgeInstancesConfirmationModal"
      title={i18n.translate('xpack.slo.purgeInstancesModal.title', {
        defaultMessage: 'Purge stale instances?',
      })}
      cancelButtonText={i18n.translate('xpack.slo.purgeInstancesModal.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.slo.purgeInstancesModal.disableButtonLabel', {
        defaultMessage: 'Purge',
      })}
      onCancel={onCancel}
      onConfirm={() => {
        purgeInstances({
          list: [],
          staleDuration: '7d',
          force: false,
        });
        onConfirm();
      }}
    >
      {i18n.translate('xpack.slo.purgeInstancesModal.descriptionText', {
        defaultMessage: 'There are 235,343 stale SLO instances that will be purged.',
      })}
    </EuiConfirmModal>
  );
}

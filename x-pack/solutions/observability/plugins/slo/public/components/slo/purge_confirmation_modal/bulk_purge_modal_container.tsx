/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SLODefinitionResponse } from '@kbn/slo-schema';
import React from 'react';
import { useBulkPurgeRollupData } from '../../../pages/slo_management/hooks/use_bulk_purge_rollup_data';
import { PurgePolicyData, SloPurgeConfirmationModal } from './purge_confirmation_modal';

export interface Props {
  onCancel: () => void;
  onConfirm: () => void;
  items: SLODefinitionResponse[];
}

export function BulkPurgeConfirmationContainer({ items, onCancel, onConfirm }: Props) {
  const { mutate: bulkPurge } = useBulkPurgeRollupData({ onConfirm });

  const onClickConfirm = (purgePolicyData: PurgePolicyData) => {
    const { purgeDate, purgeType, forcePurge, age } = purgePolicyData;
    bulkPurge({
      list: items.map(({ id }) => id),
      purgePolicy:
        purgeType === 'fixed_age'
          ? {
              purgeType: 'fixed_age',
              age,
            }
          : {
              purgeType: 'fixed_time',
              timestamp: purgeDate!.toISOString(),
            },
      force: forcePurge,
    });
  };

  const MODAL_TITLE = i18n.translate('xpack.slo.bulkPurgeConfirmationModal.title', {
    defaultMessage: 'Purge {count} SLOs',
    values: { count: items.length },
  });

  const PURGE_POLICY_HELP_TEXT = i18n.translate(
    'xpack.slo.bulkPurgeConfirmationModal.descriptionText',
    {
      defaultMessage:
        'Rollup data for {count} SLOs will be purged according to the policy provided below.',
      values: { count: items.length },
    }
  );

  return (
    <SloPurgeConfirmationModal
      onCancel={onCancel}
      onConfirm={onClickConfirm}
      modalTitle={MODAL_TITLE}
      purgePolicyHelpText={PURGE_POLICY_HELP_TEXT}
    />
  );
}

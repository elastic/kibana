/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SLODefinitionResponse } from '@kbn/slo-schema';
import React from 'react';
import { PurgePolicyData, SloPurgeConfirmationModal } from './purge_confirmation_modal';
import { usePurgeRollupData } from '../../../pages/slo_management/hooks/use_purge_rollup_data';

export interface Props {
  onCancel: () => void;
  onConfirm: () => void;
  item: SLODefinitionResponse;
}

export function PurgeConfirmationContainer({ item, onCancel, onConfirm }: Props) {
  const { mutate: purge } = usePurgeRollupData({ name: item.name, onConfirm });

  const onClickConfirm = (purgePolicyData: PurgePolicyData) => {
    const { purgeDate, purgeType, forcePurge, age } = purgePolicyData;
    purge({
      list: [item.id],
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

  const MODAL_TITLE = i18n.translate('xpack.slo.purgeConfirmationModal.title', {
    defaultMessage: 'Purge {name}',
    values: { name: item.name },
  });

  const PURGE_POLICY_HELP_TEXT = i18n.translate(
    'xpack.slo.purgeConfirmationModal.descriptionText',
    {
      defaultMessage:
        'Rollup data for {name} will be purged according to the policy provided below.',
      values: { name: item.name },
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { BulkPurgePolicyInput, SLODefinitionResponse } from '@kbn/slo-schema';
import React from 'react';
import { useBulkPurgeRollup } from '../../../pages/slo_management/hooks/use_bulk_purge_rollup';
import { PurgeRollupConfirmationModal } from './purge_rollup_confirmation_modal';

interface Props {
  onCancel: () => void;
  onConfirm: () => void;
  item: SLODefinitionResponse;
}

export function SloPurgeRollupConfirmationModal({ item, onCancel, onConfirm }: Props) {
  const { mutate: purge } = useBulkPurgeRollup({ onConfirm });

  const onClickConfirm = (purgePolicy: BulkPurgePolicyInput, force: boolean) => {
    purge({
      list: [item],
      purgePolicy,
      force,
    });
  };

  return (
    <PurgeRollupConfirmationModal
      onCancel={onCancel}
      onConfirm={onClickConfirm}
      purgePolicyHelpText={i18n.translate('xpack.slo.purgeConfirmationModal.descriptionText', {
        defaultMessage:
          'Rollup data for {name} will be purged according to the policy provided below.',
        values: { name: item.name },
      })}
    />
  );
}

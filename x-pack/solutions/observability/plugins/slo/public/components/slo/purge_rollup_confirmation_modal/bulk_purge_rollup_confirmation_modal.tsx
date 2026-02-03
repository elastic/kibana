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
  items: SLODefinitionResponse[];
}

export function BulkPurgeRollupConfirmationModal({ items, onCancel, onConfirm }: Props) {
  const { mutate: bulkPurge } = useBulkPurgeRollup({ onConfirm });

  const onClickConfirm = (purgePolicy: BulkPurgePolicyInput, force: boolean) => {
    bulkPurge({
      list: items,
      purgePolicy,
      force,
    });
  };

  return (
    <PurgeRollupConfirmationModal
      onCancel={onCancel}
      onConfirm={onClickConfirm}
      purgePolicyHelpText={i18n.translate('xpack.slo.bulkPurgeConfirmationModal.descriptionText', {
        defaultMessage:
          'Purge rollup data for {count} selected SLOs according to the following policy.',
        values: { count: items.length },
      })}
    />
  );
}

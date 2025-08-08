/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { useUpdateSlo } from '../../hooks/use_update_slo';
import { ManageLinkedDashboardsFlyout } from './manage_linked_dashboards_flyout';
import type { Dashboard } from './types';

export interface Props {
  slo: SLOWithSummaryResponse | SLODefinitionResponse;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ManageLinkedDashboardsContainer({ slo, onCancel, onConfirm }: Props) {
  const { mutateAsync: updateSlo, isLoading: isUpdateSloLoading } = useUpdateSlo();
  return (
    <ManageLinkedDashboardsFlyout
      assets={slo.assets}
      onClose={onCancel}
      onSave={(dashboards: Dashboard[]) => {
        updateSlo({
          sloId: slo.id,
          slo: {
            assets: dashboards.map((dashboard) => ({
              type: 'dashboard',
              id: dashboard.id,
              label: dashboard.title,
            })),
          },
        }).then(() => onConfirm());
      }}
    />
  );
}

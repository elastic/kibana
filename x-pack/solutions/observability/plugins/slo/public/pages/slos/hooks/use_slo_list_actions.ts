/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useCallback } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import type { SingleOverviewCustomState } from '../../../../common/embeddables/overview/types';
import { SLO_OVERVIEW_EMBEDDABLE_ID } from '../../../../common/embeddables/overview/constants';

export function useSloListActions({
  slo,
  setIsAddRuleFlyoutOpen,
  setIsActionsPopoverOpen,
}: {
  slo: SLOWithSummaryResponse;
  setIsActionsPopoverOpen: (val: boolean) => void;
  setIsAddRuleFlyoutOpen: (val: boolean) => void;
}) {
  const { embeddable } = useKibana().services;

  const handleCreateRule = () => {
    setIsActionsPopoverOpen(false);
    setIsAddRuleFlyoutOpen(true);
  };

  const handleAttachToDashboardSave: SaveModalDashboardProps['onSave'] = useCallback(
    async ({
      dashboardId,
      newTitle,
      newDescription,
    }: Parameters<SaveModalDashboardProps['onSave']>[0]) => {
      const stateTransfer = embeddable.getStateTransfer();
      const embeddableInput: SingleOverviewCustomState & {
        title: string;
        description?: string;
      } = {
        title: newTitle,
        description: newDescription,
        slo_id: slo.id,
        slo_instance_id: slo.instanceId,
        remote_name: slo.remote?.remoteName,
        overview_mode: 'single',
      };

      const state = {
        serializedState: embeddableInput,
        type: SLO_OVERVIEW_EMBEDDABLE_ID,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

      stateTransfer.navigateToWithEmbeddablePackages('dashboards', {
        state: [state],
        path,
      });
    },
    [embeddable, slo.id, slo.instanceId, slo.remote?.remoteName]
  );

  return {
    handleCreateRule,
    handleAttachToDashboardSave,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import { useCallback } from 'react';
import { SLO_ERROR_BUDGET_ID } from '../../../../../embeddable/slo/error_budget/constants';
import { useKibana } from '../../../../../hooks/use_kibana';
import type { ErrorBudgetChartPanelProps } from './types';
import { ErrorBudgetChartFlyoutPanel } from './error_budget_chart_flyout_panel';
import { ErrorBudgetChartPagePanel as ErrorBudgetChartPagePanel } from './error_budget_chart_page_panel';
import { useSloDetailsContext } from '../../slo_details_context';

export function ErrorBudgetChartPanel(props: ErrorBudgetChartPanelProps) {
  const { slo, isFlyout } = useSloDetailsContext();
  const { embeddable } = useKibana().services;

  const handleAttachToDashboardSave: SaveModalDashboardProps['onSave'] = useCallback(
    async ({ dashboardId, newTitle, newDescription }) => {
      const stateTransfer = embeddable!.getStateTransfer();
      const embeddableInput = {
        title: newTitle,
        description: newDescription,
        sloId: slo.id,
        sloInstanceId: slo.instanceId,
      };

      const state = {
        serializedState: embeddableInput,
        type: SLO_ERROR_BUDGET_ID,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

      stateTransfer.navigateToWithEmbeddablePackages('dashboards', {
        state: [state],
        path,
      });
    },
    [embeddable, slo.id, slo.instanceId]
  );

  if (isFlyout) {
    return (
      <ErrorBudgetChartFlyoutPanel
        {...props}
        handleAttachToDashboardSave={handleAttachToDashboardSave}
      />
    );
  }

  return (
    <ErrorBudgetChartPagePanel
      {...props}
      handleAttachToDashboardSave={handleAttachToDashboardSave}
    />
  );
}

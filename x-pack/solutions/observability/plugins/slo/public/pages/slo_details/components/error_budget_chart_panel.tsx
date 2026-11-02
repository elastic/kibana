/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import { SavedObjectSaveModalDashboard } from '@kbn/presentation-util-plugin/public';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useCallback, useState } from 'react';
import type { ErrorBudgetEmbeddableState } from '../../../embeddable/slo/error_budget/types';
import { SLO_ERROR_BUDGET_ID } from '../../../embeddable/slo/error_budget/constants';
import { useKibana } from '../../../hooks/use_kibana';
import type { ChartData } from '../../../typings/slo';
import type { TimeBounds } from '../types';
import { ErrorBudgetChart } from './error_budget_chart';
import { ErrorBudgetHeader } from './error_budget_header';

export interface Props {
  data: ChartData[];
  isLoading: boolean;
  slo: SLOWithSummaryResponse;
  onBrushed?: (timeBounds: TimeBounds) => void;
  hideHeaderDurationLabel?: boolean;
}

export function ErrorBudgetChartPanel({
  data,
  isLoading,
  slo,
  onBrushed,
  hideHeaderDurationLabel = false,
}: Props) {
  const [isDashboardAttachmentReady, setDashboardAttachmentReady] = useState(false);
  const { embeddable } = useKibana().services;

  const handleAttachToDashboardSave: SaveModalDashboardProps['onSave'] = useCallback(
    async ({ dashboardId, newTitle, newDescription }) => {
      const stateTransfer = embeddable!.getStateTransfer();
      const serializedState: ErrorBudgetEmbeddableState = {
        slo_id: slo.id,
        slo_instance_id: slo.instanceId,
        title: newTitle,
        description: newDescription,
      };

      const state: EmbeddablePackageState<ErrorBudgetEmbeddableState> = {
        type: SLO_ERROR_BUDGET_ID,
        serializedState,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

      stateTransfer.navigateToWithEmbeddablePackages<ErrorBudgetEmbeddableState>('dashboards', {
        state: [state],
        path,
      });
    },
    [embeddable, slo.id, slo.instanceId]
  );

  return (
    <>
      <EuiPanel
        paddingSize="m"
        color="transparent"
        hasBorder
        data-test-subj="errorBudgetChartPanel"
      >
        <EuiFlexGroup direction="column" gutterSize="l">
          <ErrorBudgetHeader
            slo={slo}
            hideHeaderDurationLabel={hideHeaderDurationLabel}
            setDashboardAttachmentReady={setDashboardAttachmentReady}
          />

          <ErrorBudgetChart slo={slo} data={data} isLoading={isLoading} onBrushed={onBrushed} />
        </EuiFlexGroup>
      </EuiPanel>
      {isDashboardAttachmentReady ? (
        <SavedObjectSaveModalDashboard
          objectType={i18n.translate(
            'xpack.slo.errorBudgetBurnDown.actions.attachToDashboard.objectTypeLabel',
            { defaultMessage: 'SLO Error Budget burn down' }
          )}
          documentInfo={{
            title: i18n.translate(
              'xpack.slo.errorBudgetBurnDown.actions.attachToDashboard.attachmentTitle',
              { defaultMessage: 'SLO Error Budget burn down' }
            ),
          }}
          canSaveByReference={false}
          onClose={() => {
            setDashboardAttachmentReady(false);
          }}
          onSave={handleAttachToDashboardSave}
        />
      ) : null}
    </>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import {
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import React, { useState } from 'react';
import { ErrorBudgetChart } from './error_budget_chart';
import { ErrorBudgetHeader } from './error_budget_header';
import type { ErrorBudgetChartPanelProps } from './types';
import { useSloDetailsContext } from '../../slo_details_context';

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

interface Props extends ErrorBudgetChartPanelProps {
  handleAttachToDashboardSave: SaveModalDashboardProps['onSave'];
}

export function ErrorBudgetChartPagePanel({
  data,
  isLoading,
  handleAttachToDashboardSave,
  onBrushed,
  hideHeaderDurationLabel = false,
}: Props) {
  const { slo } = useSloDetailsContext();
  const [isMouseOver, setIsMouseOver] = useState(false);

  const [isDashboardAttachmentReady, setDashboardAttachmentReady] = useState(false);

  return (
    <>
      <EuiPanel
        paddingSize="m"
        color="transparent"
        hasBorder
        data-test-subj="errorBudgetChartPanel"
        onMouseOver={() => {
          if (!isMouseOver) {
            setIsMouseOver(true);
          }
        }}
        onMouseLeave={() => {
          if (isMouseOver) {
            setIsMouseOver(false);
          }
        }}
      >
        <EuiFlexGroup direction="column" gutterSize="l">
          <ErrorBudgetHeader
            slo={slo}
            hideHeaderDurationLabel={hideHeaderDurationLabel}
            isMouseOver={isMouseOver}
            setDashboardAttachmentReady={setDashboardAttachmentReady}
          />

          <ErrorBudgetChart data={data} isLoading={isLoading} onBrushed={onBrushed} />
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { rollingTimeWindowTypeSchema } from '@kbn/slo-schema';
import React from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { toDurationAdverbLabel, toDurationLabel } from '../../../utils/slo/labels';

import { ErrorBudgetActions } from './error_budget_actions';

interface Props {
  slo: SLOWithSummaryResponse;
  hideTitle?: boolean;
  hideHeaderDurationLabel?: boolean;
  isMouseOver?: boolean;
  setDashboardAttachmentReady?: (value: boolean) => void;
}

export function ErrorBudgetHeader({
  slo,
  hideTitle = false,
  hideHeaderDurationLabel = false,
  isMouseOver,
  setDashboardAttachmentReady,
}: Props) {
  const { executionContext } = useKibana().services;
  const executionContextName = executionContext.get().name;
  const isDashboardContext = executionContextName === 'dashboards';

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <EuiFlexGroup>
          {!hideTitle && (
            <EuiFlexItem>
              <EuiTitle size="xs" data-test-subj="errorBudgetPanelTitle">
                <h2>
                  {i18n.translate('xpack.slo.sloDetails.errorBudgetChartPanel.title', {
                    defaultMessage: 'Error budget burn down',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          )}
          {!isDashboardContext && (
            <EuiFlexGroup justifyContent="flexEnd" wrap>
              {isMouseOver && (
                <EuiFlexItem grow={false}>
                  <ErrorBudgetActions setDashboardAttachmentReady={setDashboardAttachmentReady} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {!hideHeaderDurationLabel && (
        <EuiFlexItem>
          <EuiText color="subdued" size="s">
            {rollingTimeWindowTypeSchema.is(slo.timeWindow.type)
              ? i18n.translate('xpack.slo.sloDetails.errorBudgetChartPanel.duration', {
                  defaultMessage: 'Last {duration}',
                  values: { duration: toDurationLabel(slo.timeWindow.duration) },
                })
              : toDurationAdverbLabel(slo.timeWindow.duration)}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

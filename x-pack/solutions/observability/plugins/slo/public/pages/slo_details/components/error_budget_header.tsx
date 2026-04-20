/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { rollingTimeWindowTypeSchema } from '@kbn/slo-schema';
import React from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { toDurationAdverbLabel, toDurationLabel } from '../../../utils/slo/labels';

interface Props {
  slo: SLOWithSummaryResponse;
  hideTitle?: boolean;
  hideHeaderDurationLabel?: boolean;
  setDashboardAttachmentReady?: (value: boolean) => void;
}

export function ErrorBudgetHeader({
  slo,
  hideTitle = false,
  hideHeaderDurationLabel = false,
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
          {!isDashboardContext && setDashboardAttachmentReady && (
            <EuiFlexItem grow={false}>
              <EuiLink
                onClick={() => setDashboardAttachmentReady(true)}
                data-test-subj="sloActionsAddToDashboard"
              >
                {i18n.translate('xpack.slo.item.actions.addToDashboard', {
                  defaultMessage: 'Add to Dashboard',
                })}
              </EuiLink>
            </EuiFlexItem>
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

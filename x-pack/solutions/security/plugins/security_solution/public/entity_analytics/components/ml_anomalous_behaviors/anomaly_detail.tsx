/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiPanel, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AnomalySummaryEntry } from '../../../../common/api/entity_analytics';
import { anomalyToDisplayDetails } from './anomaly_display_type';
import { ExpectedPanel, ObservedPanel } from './display_types/shared';

interface AnomalyDetailProps {
  anomaly: AnomalySummaryEntry;
}

export const AnomalyDetail: React.FC<AnomalyDetailProps> = ({ anomaly }) => {
  const { euiTheme } = useEuiTheme();
  const { expectedHeader, expectedSubtitle, observedHeader } = anomalyToDisplayDetails(anomaly);

  const actual = anomaly.actual[0] ?? null;
  const typical = anomaly.typical[0] ?? null;
  const multiplier =
    actual !== null && typical !== null && typical > 0 ? Math.round(actual / typical) : null;
  const observedSubtitle =
    multiplier !== null && multiplier > 1 ? `${multiplier}x greater than baseline` : null;

  return (
    <EuiPanel
      paddingSize="s"
      color="subdued"
      hasShadow={false}
      css={css`
        border-top: 1px solid ${euiTheme.border.color};
        border-radius: 0 0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium};
      `}
    >
      <EuiSpacer size="s" />
      <EuiPanel paddingSize="m" hasShadow={false}>
        <EuiText size="xs" color="subdued">
          <h4>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.components.mlAnomalousBehaviors.anomalyDetail.baselineTitle"
              defaultMessage="Baseline vs Observed"
            />
          </h4>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <ExpectedPanel>
            <EuiText size="s">
              <strong>{expectedHeader}</strong>
            </EuiText>
            {expectedSubtitle && (
              <EuiText size="xs" color="subdued">
                {expectedSubtitle}
              </EuiText>
            )}
          </ExpectedPanel>
          <ObservedPanel>
            <EuiText size="s">
              <strong>{observedHeader}</strong>
            </EuiText>
            {observedSubtitle && (
              <EuiText size="xs" color="subdued">
                {observedSubtitle}
              </EuiText>
            )}
          </ObservedPanel>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  );
};

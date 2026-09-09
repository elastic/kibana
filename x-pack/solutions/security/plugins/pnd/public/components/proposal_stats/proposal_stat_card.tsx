/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { ProposalSparkline } from './proposal_sparkline';
import * as i18n from './translations';
import { CHART_ARIA_LABEL } from './translations';
import type { StatPanelColor } from './constants';

interface ProposalStatCardProps {
  id: string;
  label: string;
  /** EUI semantic color token — 'danger' | 'warning' | 'primary'. */
  color: StatPanelColor;
  /** Current open count (last bucket value). */
  count: number;
  /** Time-series data for the sparkline, ordered oldest-first. */
  series: Array<{ x: number; y: number }>;
  isLoading: boolean;
}

/**
 * One stat card: a bold current count + label above a filled-area sparkline
 * and a "24h ago / Now" axis label row below it.
 */
export const ProposalStatCard: React.FC<ProposalStatCardProps> = ({
  id,
  label,
  color,
  count,
  series,
  isLoading,
}) => {
  const { euiTheme } = useEuiTheme();

  // Resolve the EUI semantic color to the actual hex/rgba for @elastic/charts.
  const colorMap: Record<StatPanelColor, string> = {
    danger: euiTheme.colors.danger,
    warning: euiTheme.colors.warning,
    primary: euiTheme.colors.primary,
  };
  const resolvedColor = colorMap[color];

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      css={{ borderRadius: euiTheme.size.s }}
      data-test-subj={`pndProposalStatCard-${id}`}
    >
      <EuiTitle size="xxs">
        <h3 style={{ fontWeight: euiTheme.font.weight.semiBold }}>{label}</h3>
      </EuiTitle>
      <EuiText size="s" style={{ fontWeight: euiTheme.font.weight.bold, fontSize: '1.75rem' }}>
        {isLoading ? <EuiLoadingChart size="m" /> : <span>{count}</span>}
      </EuiText>
      <EuiSpacer size="s" />
      {isLoading ? (
        <div style={{ height: 48 }} />
      ) : (
        <ProposalSparkline
          series={series}
          color={resolvedColor}
          ariaLabel={CHART_ARIA_LABEL(label, count)}
          seriesName={`${label} Actions`}
        />
      )}
      <EuiSpacer size="xs" />
      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.TWENTY_FOUR_HOURS_AGO}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.NOW}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

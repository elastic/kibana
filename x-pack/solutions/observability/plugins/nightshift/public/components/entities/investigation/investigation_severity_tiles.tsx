/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonTitle,
  EuiText,
  EuiTitle,
  euiShadowHover,
  useEuiTheme,
} from '@elastic/eui';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { Severity, SeverityCounts } from '@kbn/nightshift-investigations-plugin/common';
import { getSeverityLabel, SEVERITY_OPTIONS } from '@kbn/significant-events-schema';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { SeverityTileSparkline } from './severity_tile_sparkline';
import { buildSeverityTrendSeries } from './severity_tiles_trend';

export interface InvestigationSeverityTilesProps {
  severityCounts: SeverityCounts;
  /**
   * All investigations (any status) used to build the 72h open-date sparklines.
   * Pass every severity’s candidates; tiles filter by metadata.severity.
   */
  trendInvestigations: readonly InvestigationSummary[];
  scrollableSeverities: ReadonlySet<Severity>;
  isLoading: boolean;
  onSeverityClick: (severity: Severity) => void;
}

const severityOf = (investigation: InvestigationSummary): Severity | 'none' =>
  investigation.metadata.severity ?? 'none';

/**
 * Homepage severity overview: open count + 72h open-date trend (issue #1346 /
 * prototype OverviewStatCard chart mode). Hidden when every severity count is 0.
 */
export const InvestigationSeverityTiles = ({
  severityCounts,
  trendInvestigations,
  scrollableSeverities,
  isLoading,
  onSeverityClick,
}: InvestigationSeverityTilesProps): React.ReactElement | null => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const hasAny = SEVERITY_OPTIONS.some((severity) => severityCounts[severity] > 0);
  const seriesBySeverity = useMemo(() => {
    const bySeverity = Object.fromEntries(
      SEVERITY_OPTIONS.map((severity) => [
        severity,
        trendInvestigations.filter((investigation) => severityOf(investigation) === severity),
      ])
    ) as Record<Severity, InvestigationSummary[]>;

    return Object.fromEntries(
      SEVERITY_OPTIONS.map((severity) => [
        severity,
        buildSeverityTrendSeries({
          investigations: bySeverity[severity],
          currentCount: severityCounts[severity],
        }),
      ])
    ) as Record<Severity, ReturnType<typeof buildSeverityTrendSeries>>;
  }, [severityCounts, trendInvestigations]);

  const chartValueMax = useMemo(() => {
    let max = 1;
    for (const severity of SEVERITY_OPTIONS) {
      max = Math.max(max, severityCounts[severity]);
      for (const point of seriesBySeverity[severity]) {
        max = Math.max(max, point.value);
      }
    }
    return max;
  }, [seriesBySeverity, severityCounts]);

  const chartColors: Record<Severity, { line: string; fill: string }> = {
    critical: {
      line: euiTheme.colors.danger,
      fill: euiTheme.colors.backgroundBaseDanger,
    },
    high: {
      line: euiTheme.colors.textRisk,
      fill: euiTheme.colors.backgroundBaseRisk,
    },
    medium: {
      line: euiTheme.colors.warning,
      fill: euiTheme.colors.backgroundBaseWarning,
    },
    low: {
      line: euiTheme.colors.textNeutral,
      fill: euiTheme.colors.backgroundBaseNeutral,
    },
  };

  // Issue #1346: show trends only when there are investigations in the period.
  if (!isLoading && !hasAny) {
    return null;
  }

  const labelStyles = css`
    font-weight: ${euiTheme.font.weight.medium};
  `;
  const countStyles = css`
    font-family: 'Elastic UI Numeric', ${euiTheme.font.family};
    font-weight: ${euiTheme.font.weight.semiBold};
    font-variant-numeric: tabular-nums;
    line-height: 1;
  `;
  const mutedCountStyles = css`
    color: ${euiTheme.colors.textDisabled};
  `;
  const interactivePanelStyles = css`
    &&:hover,
    &&:focus,
    &&:focus-visible {
      ${euiShadowHover(euiThemeContext, 'xs')}
    }
  `;

  return (
    <EuiFlexGroup gutterSize="m" responsive={false} data-test-subj="nightshiftSeverityTiles">
      {SEVERITY_OPTIONS.map((severity) => {
        const count = severityCounts[severity];
        const isMuted = !scrollableSeverities.has(severity) || count === 0;
        const colors = chartColors[severity];

        return (
          <EuiFlexItem key={severity}>
            <EuiPanel
              hasBorder
              hasShadow={false}
              paddingSize="m"
              color={isMuted ? 'transparent' : undefined}
              css={isMuted ? undefined : interactivePanelStyles}
              data-test-subj={`nightshiftSeverityTile-${severity}`}
              onClick={isMuted ? undefined : () => onSeverityClick(severity)}
              {...(isMuted
                ? {}
                : getEbtProps({
                    action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SEVERITY_INVESTIGATIONS,
                    element: NIGHTSHIFT_EBT_ELEMENTS.SEVERITY_TILES,
                    detail: severity,
                  }))}
            >
              <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText color="default" size="xs" css={labelStyles}>
                    {getSeverityLabel(severity)}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSkeletonTitle
                    size="l"
                    isLoading={isLoading}
                    contentAriaLabel={i18n.translate(
                      'xpack.nightshift.investigations.severityTileCountAriaLabel',
                      {
                        defaultMessage: '{severityLabel} investigation count',
                        values: { severityLabel: getSeverityLabel(severity) },
                      }
                    )}
                  >
                    <EuiTitle size="l" css={[countStyles, isMuted ? mutedCountStyles : undefined]}>
                      <span data-test-subj={`nightshiftSeverityTileCount-${severity}`}>
                        {count}
                      </span>
                    </EuiTitle>
                  </EuiSkeletonTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <SeverityTileSparkline
                    data={seriesBySeverity[severity]}
                    lineColor={colors.line}
                    fillColor={colors.fill}
                    valueMax={chartValueMax}
                    aria-label={i18n.translate(
                      'xpack.nightshift.investigations.severityTileTrendAriaLabel',
                      {
                        defaultMessage:
                          '{severityLabel} investigations by open date over the last 72 hours',
                        values: { severityLabel: getSeverityLabel(severity) },
                      }
                    )}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

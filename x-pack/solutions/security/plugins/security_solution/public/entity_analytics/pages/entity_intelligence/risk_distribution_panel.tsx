/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiIcon, EuiSkeletonText, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EntityType } from '../../../../common/entity_analytics/types';
import { EntityIconByType } from '../../components/entity_store/entity_icon_by_type';
import type { EntityStoreStats } from './hooks/use_entity_store_stats';
import type { RiskLevel } from './common';
import { RISK_LEVELS, getRiskLevelColor } from './common';
import { IntelligencePanel, PanelEmptyState, SectionLabel } from './components';

const TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.riskDistribution.title',
  { defaultMessage: 'Risk by entity type' }
);

const TYPE_LABELS: Record<string, string> = {
  user: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.entityType.users', {
    defaultMessage: 'Users',
  }),
  host: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.entityType.hosts', {
    defaultMessage: 'Hosts',
  }),
  service: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.entityType.services',
    { defaultMessage: 'Services' }
  ),
};

interface TypeRow {
  type: string;
  total: number;
  avgRisk: number | undefined;
  segments: Array<{ level: RiskLevel; count: number }>;
}

export const RiskDistributionPanel: React.FC<{
  stats: EntityStoreStats | undefined;
  isLoading: boolean;
}> = ({ stats, isLoading }) => {
  const { euiTheme } = useEuiTheme();

  const rows = useMemo<TypeRow[]>(() => {
    if (!stats) return [];
    return stats.byType.map((typeStat) => ({
      type: typeStat.type,
      total: typeStat.count,
      avgRisk: typeStat.avgRisk,
      segments: RISK_LEVELS.map((level) => ({
        level,
        count:
          stats.byLevel.find((entry) => entry.type === typeStat.type && entry.level === level)
            ?.count ?? 0,
      })).filter((segment) => segment.count > 0),
    }));
  }, [stats]);

  const levelTotals = useMemo(
    () =>
      RISK_LEVELS.map((level) => ({
        level,
        count:
          stats?.byLevel
            .filter((entry) => entry.level === level)
            .reduce((sum, entry) => sum + entry.count, 0) ?? 0,
      })),
    [stats]
  );

  const rowStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.m};
    padding: ${euiTheme.size.s} 0;

    & + & {
      border-top: ${euiTheme.border.thin};
    }
  `;

  const typeLabelStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    width: 110px;
    flex-shrink: 0;
    font-size: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.medium};
    color: ${euiTheme.colors.textParagraph};
  `;

  const typeMetaStyle = css`
    width: 130px;
    flex-shrink: 0;
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-size: 11px;
    color: ${euiTheme.colors.textSubdued};
  `;

  const barTrackStyle = css`
    flex: 1;
    display: flex;
    height: ${euiTheme.size.m};
    border-radius: ${euiTheme.border.radius.small};
    overflow: hidden;
    background: ${euiTheme.colors.lightestShade};
  `;

  const countStyle = css`
    width: 72px;
    flex-shrink: 0;
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-size: ${euiTheme.size.m};
    color: ${euiTheme.colors.textSubdued};
  `;

  const legendStyle = css`
    display: flex;
    flex-wrap: wrap;
    gap: ${euiTheme.size.s} ${euiTheme.size.m};
    margin-top: ${euiTheme.size.m};
    padding-top: ${euiTheme.size.s};
    border-top: ${euiTheme.border.thin};
  `;

  const legendItemStyle = css`
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    font-size: 11px;
    color: ${euiTheme.colors.textSubdued};
    font-variant-numeric: tabular-nums;
  `;

  return (
    <IntelligencePanel data-test-subj="entityIntelligenceRiskDistribution">
      <SectionLabel>{TITLE}</SectionLabel>
      <EuiSpacer size="s" />
      {isLoading ? (
        <EuiSkeletonText lines={3} />
      ) : rows.length === 0 ? (
        <PanelEmptyState
          iconType="chartBarHorizontalStack"
          message={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.riskDistribution.empty',
            { defaultMessage: 'No risk data yet — enable the risk engine to score entities.' }
          )}
        />
      ) : (
        <>
          {rows.map((row) => {
            const iconType =
              EntityIconByType[row.type as EntityType] ?? EntityIconByType[EntityType.generic];
            const scoredTotal = row.segments.reduce((sum, segment) => sum + segment.count, 0);
            return (
              <div key={row.type} css={rowStyle}>
                <span css={typeLabelStyle}>
                  <EuiIcon type={iconType} size="m" color="subdued" aria-hidden={true} />
                  {TYPE_LABELS[row.type] ?? row.type}
                </span>
                <div css={barTrackStyle}>
                  {row.segments.map((segment) => (
                    <div
                      key={segment.level}
                      title={`${segment.level}: ${segment.count}`}
                      css={css`
                        width: ${scoredTotal > 0 ? (segment.count / scoredTotal) * 100 : 0}%;
                        background: ${getRiskLevelColor(euiTheme, segment.level)};
                        min-width: ${segment.count > 0 ? '3px' : '0'};
                      `}
                    />
                  ))}
                </div>
                <span css={typeMetaStyle}>
                  {row.avgRisk !== undefined
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.riskDistribution.avgRisk',
                        {
                          defaultMessage: 'avg risk {avg}',
                          values: { avg: row.avgRisk.toFixed(1) },
                        }
                      )
                    : null}
                </span>
                <span css={countStyle}>{row.total.toLocaleString()}</span>
              </div>
            );
          })}
          <div css={legendStyle}>
            {levelTotals.map(({ level, count }) => (
              <span key={level} css={legendItemStyle}>
                <span
                  css={css`
                    width: ${euiTheme.size.s};
                    height: ${euiTheme.size.s};
                    border-radius: 2px;
                    background: ${getRiskLevelColor(euiTheme, level)};
                  `}
                />
                {level}
                {` · ${count.toLocaleString()}`}
              </span>
            ))}
          </div>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.riskDistribution.caption',
                {
                  defaultMessage:
                    'Distribution of calculated risk levels among scored entities per type.',
                }
              )}
            </p>
          </EuiText>
        </>
      )}
    </IntelligencePanel>
  );
};

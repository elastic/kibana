/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiIcon,
  EuiIconTip,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EntityType } from '../../../../common/entity_analytics/types';
import { EntityIconByType } from '../../components/entity_store/entity_icon_by_type';
import type { HuntingLead } from '../../components/threat_hunting/top_threat_hunting_leads/types';
import type { IntelligenceEntity, RiskLevel } from './common';
import { getRiskLevelColor } from './common';
import type { CompactAnomaly } from './hooks/use_compact_anomalies';
import type { EntityStoreStats } from './hooks/use_entity_store_stats';
import {
  calculatePostureMetric,
  getMaterialRiskConcentration,
  rankNeedsAttention,
} from './overview_metrics';
import type {
  AttentionItem,
  AttentionSeverity,
  ConcentrationFilter,
  PostureProvenance,
  PostureTrend,
} from './overview_metrics';
import { RiskDial } from './risk_dial';
import { staggeredEntrance, useCountUp } from './animations';

const TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.user]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.usersLabel',
    { defaultMessage: 'users' }
  ),
  [EntityType.host]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.hostsLabel',
    { defaultMessage: 'hosts' }
  ),
  [EntityType.service]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.servicesLabel',
    { defaultMessage: 'services' }
  ),
  [EntityType.generic]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.otherEntitiesLabel',
    { defaultMessage: 'other entities' }
  ),
};

const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  Critical: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.criticalLabel',
    { defaultMessage: 'Critical' }
  ),
  High: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.highLabel',
    { defaultMessage: 'High' }
  ),
  Moderate: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.moderateLabel',
    { defaultMessage: 'Moderate' }
  ),
  Low: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.lowLabel',
    { defaultMessage: 'Low' }
  ),
  Unknown: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.unknownLabel',
    { defaultMessage: 'Unknown' }
  ),
};

const getAttentionColor = (
  severity: AttentionSeverity,
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']
): string => {
  switch (severity) {
    case 'critical':
      return euiTheme.colors.severity.danger;
    case 'high':
      return euiTheme.colors.severity.risk;
    case 'moderate':
      return euiTheme.colors.severity.warning;
    default:
      return euiTheme.colors.severity.neutral;
  }
};

const getAttentionSeverityLabel = (severity: AttentionSeverity): string => {
  switch (severity) {
    case 'critical':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.overview.attention.criticalLabel',
        { defaultMessage: 'Critical' }
      );
    case 'high':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.overview.attention.highLabel',
        { defaultMessage: 'High' }
      );
    case 'moderate':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.overview.attention.moderateLabel',
        { defaultMessage: 'Moderate' }
      );
    default:
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.overview.attention.lowLabel',
        { defaultMessage: 'Low' }
      );
  }
};

const getAttentionTitle = (item: AttentionItem): string => {
  if (item.kind === 'entity') return item.entity.name;
  if (item.kind === 'lead') return item.lead.title;
  return item.anomaly.entityName;
};

const getAttentionReason = (item: AttentionItem): string => {
  if (item.kind === 'entity') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.overview.attention.entityReasonDescription',
      {
        defaultMessage: 'Normalized risk {score} · {level}',
        values: {
          score: Math.round(item.entity.riskScoreNorm ?? 0),
          level: RISK_LEVEL_LABELS[item.entity.riskLevel],
        },
      }
    );
  }
  if (item.kind === 'lead') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.overview.attention.leadReasonDescription',
      {
        defaultMessage: 'Hunting lead · Priority {priority}/10',
        values: { priority: item.lead.priority },
      }
    );
  }
  return i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.attention.anomalyReasonDescription',
    {
      defaultMessage: 'ML anomaly · Score {score}',
      values: { score: item.anomaly.maxScore },
    }
  );
};

const TREND_DIRECTION_ICON: Record<PostureTrend['direction'], string> = {
  up: 'sortUp',
  down: 'sortDown',
  flat: 'minus',
};

interface PostureTrendIndicatorProps {
  trend: PostureTrend | undefined;
  comparedToIso: string;
}

/**
 * Renders a grounded posture trend: a direction-colored arrow with the point
 * delta versus a prior window, plus a tooltip explaining the comparison window
 * and source. When no comparable prior data exists (`trend` undefined) it keeps
 * the honest "Trend unavailable" state rather than implying stability.
 *
 * Direction color follows intent, not risk band: a *rising* risk score is worse
 * (danger), a *falling* one is better (success), and flat is neutral.
 */
const PostureTrendIndicator: React.FC<PostureTrendIndicatorProps> = ({ trend, comparedToIso }) => {
  const { euiTheme } = useEuiTheme();

  if (!trend) {
    return (
      <EuiText size="xs" color="subdued">
        <span>
          {'· '}
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.trendUnavailableDescription',
            { defaultMessage: 'Trend unavailable' }
          )}
        </span>
      </EuiText>
    );
  }

  const color =
    trend.direction === 'up'
      ? euiTheme.colors.severity.danger
      : trend.direction === 'down'
      ? euiTheme.colors.severity.success
      : euiTheme.colors.textSubdued;

  const roundedScore = Math.round(Math.abs(trend.deltaScore));
  const label =
    trend.direction === 'flat'
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.trendFlatDescription',
          { defaultMessage: 'Flat vs {comparedTo}', values: { comparedTo: trend.comparedTo } }
        )
      : i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.trendDeltaDescription',
          {
            defaultMessage: '{points, plural, one {# pt} other {# pts}} vs {comparedTo}',
            values: { points: roundedScore, comparedTo: trend.comparedTo },
          }
        );

  const materialLabel =
    trend.deltaMaterial === 0
      ? undefined
      : i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.trendMaterialDescription',
          {
            defaultMessage:
              '{sign}{count, plural, one {# material-risk entity} other {# material-risk entities}}',
            values: {
              sign: trend.deltaMaterial > 0 ? '+' : '−',
              count: Math.abs(trend.deltaMaterial),
            },
          }
        );

  const tooltip = i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.trendTooltip',
    {
      defaultMessage:
        'Change in the weighted-average posture score versus the same population at {comparedTo} ({date}). The prior point is the latest risk engine score per entity from the risk-score history index (risk-score.risk-score for this space). Material-risk delta is the change in High/Critical entities.',
      values: { comparedTo: trend.comparedTo, date: comparedToIso.slice(0, 10) },
    }
  );

  return (
    <EuiText size="xs" color="subdued" data-test-subj="entityIntelligencePostureTrend">
      <span
        css={css`
          display: inline-flex;
          align-items: center;
          gap: ${euiTheme.size.xs};
        `}
      >
        {'· '}
        <EuiIcon
          type={TREND_DIRECTION_ICON[trend.direction]}
          color={color}
          size="s"
          data-test-subj={`entityIntelligencePostureTrendArrow-${trend.direction}`}
          aria-hidden={true}
        />
        <span
          css={css`
            color: ${color};
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
        >
          {label}
        </span>
        {materialLabel ? <span>{`(${materialLabel})`}</span> : null}
        <EuiIconTip type="info" content={tooltip} />
      </span>
    </EuiText>
  );
};

interface ExecutiveMetricProps {
  value: number | undefined;
  label: string;
  context: string | undefined;
  tooltip?: string;
  isLoading: boolean;
}

const ExecutiveMetric: React.FC<ExecutiveMetricProps> = ({
  value,
  label,
  context,
  tooltip,
  isLoading,
}) => {
  const { euiTheme } = useEuiTheme();
  const animatedValue = useCountUp(value);
  return (
    <div
      css={css`
        min-width: 0;
      `}
    >
      <div
        css={css`
          font-size: 22px;
          line-height: 1.1;
          font-weight: ${euiTheme.font.weight.bold};
          color: ${euiTheme.colors.textHeading};
          font-variant-numeric: tabular-nums;
        `}
      >
        {isLoading ? '…' : animatedValue?.toLocaleString() ?? '—'}
      </div>
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.xs};
          margin-top: ${euiTheme.size.xs};
          font-size: ${euiTheme.size.m};
          font-weight: ${euiTheme.font.weight.medium};
          color: ${euiTheme.colors.textParagraph};
        `}
      >
        <span>{label}</span>
        {tooltip ? <EuiIconTip type="info" content={tooltip} /> : null}
      </div>
      {context ? (
        <div
          css={css`
            margin-top: 2px;
            font-size: 11px;
            color: ${euiTheme.colors.textSubdued};
          `}
        >
          {context}
        </div>
      ) : null}
    </div>
  );
};

interface ExecutivePostureHeroProps {
  stats: EntityStoreStats | undefined;
  previousStats: EntityStoreStats | undefined;
  trendLookbackDays: number;
  trendComparedToIso: string;
  entities: readonly IntelligenceEntity[];
  leads: readonly HuntingLead[];
  leadsCount: number;
  anomalies: readonly CompactAnomaly[];
  provenance: PostureProvenance;
  isLoading: boolean;
  onInvestigate: (entity: IntelligenceEntity) => void;
  onViewAllEntities: () => void;
  onSelectConcentration: (filter: ConcentrationFilter) => void;
  onViewSignals: () => void;
}

export const ExecutivePostureHero: React.FC<ExecutivePostureHeroProps> = ({
  stats,
  previousStats,
  trendLookbackDays,
  trendComparedToIso,
  entities,
  leads,
  leadsCount,
  anomalies,
  provenance,
  isLoading,
  onInvestigate,
  onViewAllEntities,
  onSelectConcentration,
  onViewSignals,
}) => {
  const { euiTheme } = useEuiTheme();
  const comparedToLabel = i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.trendComparedToLabel',
    {
      defaultMessage: '{days, plural, one {# day ago} other {# days ago}}',
      values: { days: trendLookbackDays },
    }
  );
  const posture = useMemo(
    () => calculatePostureMetric(stats, { stats: previousStats, comparedTo: comparedToLabel }),
    [stats, previousStats, comparedToLabel]
  );
  const concentration = useMemo(() => getMaterialRiskConcentration(stats), [stats]);
  const attentionItems = useMemo(
    () => rankNeedsAttention({ entities, leads, anomalies }),
    [anomalies, entities, leads]
  );
  const topEntity = entities[0];
  const activeSignals = leadsCount + anomalies.length;
  const animatedScore = useCountUp(posture.score);
  const postureAccent = getRiskLevelColor(euiTheme, posture.level);

  const heroStyle = css`
    display: grid;
    grid-template-columns: minmax(0, 1.75fr) minmax(330px, 0.8fr);
    gap: ${euiTheme.size.xl};
    padding: ${euiTheme.size.xl};
    border-radius: ${euiTheme.border.radius.medium};
    background: radial-gradient(
        circle at 4% 0%,
        ${transparentize(postureAccent, 0.12)},
        transparent 34%
      ),
      linear-gradient(
        135deg,
        ${transparentize(euiTheme.colors.primary, 0.045)},
        ${euiTheme.colors.emptyShade} 52%,
        ${transparentize(euiTheme.colors.accent, 0.025)}
      );

    @media (max-width: 1050px) {
      grid-template-columns: 1fr;
    }
  `;
  const titleRowStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
  `;
  const postureSummaryStyle = css`
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: ${euiTheme.size.xl};
    margin-top: ${euiTheme.size.m};

    @media (max-width: 700px) {
      grid-template-columns: 1fr;
    }
  `;
  const scoreMetaStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    margin-bottom: ${euiTheme.size.s};
  `;
  const narrativeStyle = css`
    max-width: 760px;
    font-size: 20px;
    line-height: 1.42;
    font-weight: ${euiTheme.font.weight.medium};
    color: ${euiTheme.colors.textHeading};
  `;
  const metricRowStyle = css`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: ${euiTheme.size.l};
    margin-top: ${euiTheme.size.l};
    padding-top: ${euiTheme.size.m};
    border-top: ${euiTheme.border.width.thin} solid
      ${transparentize(euiTheme.colors.borderBasePlain, 0.55)};
  `;
  const driversStyle = css`
    display: flex;
    flex-wrap: wrap;
    gap: ${euiTheme.size.s};
    margin-top: ${euiTheme.size.l};
  `;
  const provenanceStyle = css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${euiTheme.size.s};
    margin-top: ${euiTheme.size.m};
    color: ${euiTheme.colors.textSubdued};
    font-size: 11px;
  `;
  const provenanceChipStyle = css`
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    padding: 2px ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.small};
    background: ${transparentize(euiTheme.colors.primary, 0.06)};
    color: ${euiTheme.colors.textParagraph};
    font-variant-numeric: tabular-nums;
  `;
  const driverStyle = css`
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    min-width: 0;
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border: ${euiTheme.border.width.thin} solid
      ${transparentize(euiTheme.colors.borderBasePlain, 0.65)};
    border-radius: ${euiTheme.border.radius.medium};
    color: ${euiTheme.colors.textParagraph};
    background: ${transparentize(euiTheme.colors.emptyShade, 0.72)};
    cursor: pointer;
    text-align: left;
    transition: border-color ${euiTheme.animation.fast} ease,
      background-color ${euiTheme.animation.fast} ease;

    &:hover,
    &:focus-visible {
      border-color: ${euiTheme.colors.primary};
      background: ${transparentize(euiTheme.colors.primary, 0.055)};
      outline: none;
    }
  `;
  const attentionStyle = css`
    align-self: stretch;
    padding: ${euiTheme.size.l};
    border: ${euiTheme.border.width.thin} solid
      ${transparentize(euiTheme.colors.borderBasePlain, 0.72)};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${transparentize(euiTheme.colors.emptyShade, 0.86)};
    box-shadow: 0 12px 34px ${transparentize(euiTheme.colors.shadow, 0.08)};
  `;
  const attentionRowStyle = (severity: AttentionSeverity) => {
    const color = getAttentionColor(severity, euiTheme);
    return css`
      display: grid;
      grid-template-columns: 3px minmax(0, 1fr);
      gap: ${euiTheme.size.m};
      padding: ${euiTheme.size.m} 0;

      & + & {
        border-top: ${euiTheme.border.thin};
      }

      &::before {
        content: '';
        width: 3px;
        height: 100%;
        min-height: ${euiTheme.size.xl};
        border-radius: 3px;
        background: ${color};
      }
    `;
  };
  const attentionTitleStyle = css`
    overflow: hidden;
    color: ${euiTheme.colors.textHeading};
    font-size: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.semiBold};
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  const attentionMetaStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    margin-top: ${euiTheme.size.xs};
    color: ${euiTheme.colors.textSubdued};
    font-size: 11px;
  `;

  if (isLoading) {
    return (
      <div css={heroStyle} data-test-subj="entityIntelligencePostureLoading">
        <div>
          <EuiSkeletonText lines={5} />
          <EuiSpacer size="m" />
          <EuiSkeletonRectangle width="100%" height={76} borderRadius="m" />
        </div>
        <EuiSkeletonText lines={8} />
      </div>
    );
  }

  const postureNarrative =
    posture.score === undefined
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.unavailableDescription',
          {
            defaultMessage:
              'Entity risk posture is unavailable until the risk engine has scored entities.',
          }
        )
      : posture.materialRiskEntities === 0
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.noMaterialRiskDescription',
          {
            defaultMessage:
              'No high or critical entities require leadership attention in the current snapshot.',
          }
        )
      : concentration && posture.materialRiskEntities >= 2
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.concentratedRiskDescription',
          {
            defaultMessage:
              '{count, plural, one {# material-risk entity requires attention} other {# material-risk entities require attention}}; {concentrated} of {total} are {type}.',
            values: {
              count: posture.materialRiskEntities,
              concentrated: concentration.count,
              total: concentration.total,
              type: TYPE_LABELS[concentration.type],
            },
          }
        )
      : i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.materialRiskDescription',
          {
            defaultMessage:
              '{count, plural, one {# material-risk entity requires attention} other {# material-risk entities require attention}}.',
            values: { count: posture.materialRiskEntities },
          }
        );

  return (
    <section css={[heroStyle, staggeredEntrance(0)]} data-test-subj="entityIntelligencePosture">
      <div>
        <div css={titleRowStyle}>
          <EuiTitle size="s">
            <h2>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.title',
                { defaultMessage: 'Entity risk posture' }
              )}
            </h2>
          </EuiTitle>
          <EuiIconTip
            type="info"
            content={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.formulaTooltip',
              {
                defaultMessage:
                  'Posture is the weighted average normalized risk across entities with a calculated risk level: sum of each risk-band average multiplied by its entity count, divided by the total count. Standard bands apply: Critical 90–100, High 70–89, Moderate 40–69, Low 20–39, and Unknown below 20.',
              }
            )}
          />
        </div>

        <div css={postureSummaryStyle}>
          <RiskDial
            score={animatedScore}
            level={posture.level}
            levelLabel={RISK_LEVEL_LABELS[posture.level]}
            size="m"
          />
          <div>
            <div css={scoreMetaStyle}>
              <EuiBadge color="hollow">{RISK_LEVEL_LABELS[posture.level]}</EuiBadge>
              <EuiText size="xs" color="subdued">
                <span>
                  {posture.scoredEntities > 0
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.scoredEntityContextDescription',
                        {
                          defaultMessage:
                            'Average across {count, plural, one {# scored entity} other {# scored entities}}',
                          values: { count: posture.scoredEntities },
                        }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.noScoredEntityContextDescription',
                        { defaultMessage: 'No scored entities' }
                      )}
                </span>
              </EuiText>
              <PostureTrendIndicator trend={posture.trend} comparedToIso={trendComparedToIso} />
            </div>
            <div css={narrativeStyle}>{postureNarrative}</div>
          </div>
        </div>

        <div css={metricRowStyle}>
          <ExecutiveMetric
            value={stats?.totalEntities}
            label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.monitoredEntitiesLabel',
              { defaultMessage: 'Entities monitored' }
            )}
            context={
              stats === undefined
                ? undefined
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.monitoredEntitiesContextDescription',
                    {
                      defaultMessage:
                        '{scored, plural, one {# scored by the risk engine} other {# scored by the risk engine}}',
                      values: { scored: posture.scoredEntities },
                    }
                  )
            }
            tooltip={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.monitoredEntitiesTooltip',
              {
                defaultMessage:
                  'Monitored is every user, host, and service in the entity store. Scored is the subset with a calculated risk level; only scored entities appear in posture and risk concentration.',
              }
            )}
            isLoading={false}
          />
          <ExecutiveMetric
            value={posture.materialRiskEntities}
            label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.materialRiskEntitiesLabel',
              { defaultMessage: 'Material-risk entities' }
            )}
            context={
              posture.materialRiskPercentage === undefined
                ? undefined
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.materialRiskPercentageDescription',
                    {
                      defaultMessage: '{percentage}% of scored entities',
                      values: { percentage: Math.round(posture.materialRiskPercentage) },
                    }
                  )
            }
            tooltip={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.materialRiskFormulaTooltip',
              {
                defaultMessage:
                  'Material risk is the count of entities in the High or Critical calculated risk bands.',
              }
            )}
            isLoading={false}
          />
          <ExecutiveMetric
            value={activeSignals}
            label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.intelligenceSignalsLabel',
              { defaultMessage: 'Active intelligence signals' }
            )}
            context={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.signalContextDescription',
              {
                defaultMessage:
                  '{leads, plural, one {# lead} other {# leads}} · {anomalies, plural, one {# anomaly} other {# anomalies}}',
                values: { leads: leadsCount, anomalies: anomalies.length },
              }
            )}
            tooltip={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.signalFormulaTooltip',
              {
                defaultMessage:
                  'Active intelligence signals equal active hunting leads plus entities with ML anomalies in the last 30 days.',
              }
            )}
            isLoading={false}
          />
        </div>

        <div css={driversStyle}>
          {topEntity?.riskScoreNorm !== undefined ? (
            <button type="button" css={driverStyle} onClick={() => onInvestigate(topEntity)}>
              <EuiIcon type={EntityIconByType[topEntity.type]} color="primary" aria-hidden={true} />
              <span>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.topExposureDriverDescription',
                  {
                    defaultMessage: 'Top exposure: {name} · {score}',
                    values: {
                      name: topEntity.name,
                      score: Math.round(topEntity.riskScoreNorm),
                    },
                  }
                )}
              </span>
            </button>
          ) : null}
          {concentration ? (
            <button
              type="button"
              css={driverStyle}
              onClick={() => onSelectConcentration({ kind: 'type', value: concentration.type })}
            >
              <EuiIcon type="chartBarHorizontalStack" color="primary" aria-hidden={true} />
              <span>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.concentrationDriverDescription',
                  {
                    defaultMessage:
                      '{type}: {count} of {total} material-risk {total, plural, one {entity} other {entities}}',
                    values: {
                      type: TYPE_LABELS[concentration.type],
                      count: concentration.count,
                      total: concentration.total,
                    },
                  }
                )}
              </span>
            </button>
          ) : null}
          <button type="button" css={driverStyle} onClick={onViewSignals}>
            <EuiIcon
              type={activeSignals > 0 ? 'bullseye' : 'checkCircleFill'}
              color={activeSignals > 0 ? 'primary' : 'success'}
              aria-hidden={true}
            />
            <span>
              {activeSignals > 0
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.activeSignalsDriverDescription',
                    {
                      defaultMessage:
                        '{count, plural, one {# active intelligence signal} other {# active intelligence signals}}',
                      values: { count: activeSignals },
                    }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.overview.posture.noSignalsDriverDescription',
                    { defaultMessage: 'No active intelligence signals' }
                  )}
            </span>
          </button>
        </div>

        <div css={provenanceStyle} data-test-subj="entityIntelligencePostureProvenance">
          <span
            css={css`
              display: inline-flex;
              align-items: center;
              gap: ${euiTheme.size.xs};
              font-weight: ${euiTheme.font.weight.semiBold};
              text-transform: uppercase;
              letter-spacing: 0.04em;
            `}
          >
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.provenance.label',
              { defaultMessage: 'Based on' }
            )}
            <EuiIconTip
              type="info"
              content={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.provenance.tooltip',
                {
                  defaultMessage:
                    'Direct counts of the real evidence behind this posture: entities the risk engine scored, the entity types they span, active hunting leads, entities with ML anomalies, and — when detection alerts carry them — the MITRE tactics observed. No values are modeled.',
                }
              )}
            />
          </span>
          <span css={provenanceChipStyle}>
            <EuiIcon type="users" size="s" aria-hidden={true} />
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.provenance.scoredChip',
              {
                defaultMessage:
                  '{count, plural, one {# scored entity} other {# scored entities}} · {types, plural, one {# type} other {# types}}',
                values: {
                  count: provenance.scoredEntities,
                  types: provenance.contributingTypes,
                },
              }
            )}
          </span>
          <span css={provenanceChipStyle}>
            <EuiIcon type="bullseye" size="s" aria-hidden={true} />
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.provenance.leadsChip',
              {
                defaultMessage: '{count, plural, one {# hunting lead} other {# hunting leads}}',
                values: { count: provenance.leadCount },
              }
            )}
          </span>
          <span css={provenanceChipStyle}>
            <EuiIcon type="chartAnomaly" size="s" aria-hidden={true} />
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.provenance.anomaliesChip',
              {
                defaultMessage:
                  '{count, plural, one {# entity with anomalies} other {# entities with anomalies}}',
                values: { count: provenance.anomalyEntityCount },
              }
            )}
          </span>
          {provenance.observedTactics !== undefined ? (
            <span css={provenanceChipStyle}>
              <EuiIcon type="crosshair" size="s" aria-hidden={true} />
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.provenance.tacticsChip',
                {
                  defaultMessage:
                    '{count, plural, one {# MITRE tactic} other {# MITRE tactics}} observed',
                  values: { count: provenance.observedTactics },
                }
              )}
            </span>
          ) : null}
        </div>
      </div>

      <aside css={attentionStyle}>
        <div css={titleRowStyle}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.attention.title',
                { defaultMessage: 'Needs attention' }
              )}
            </h3>
          </EuiTitle>
          <EuiIconTip
            type="info"
            content={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.attention.rankingTooltip',
              {
                defaultMessage:
                  'Shows at most one top item from each evidence class. Entity urgency is normalized risk, lead urgency is priority multiplied by 10, and anomaly urgency is the ML anomaly score.',
              }
            )}
          />
        </div>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.attention.description',
              { defaultMessage: 'Ranked by normalized urgency across risk, leads, and anomalies.' }
            )}
          </p>
        </EuiText>
        <EuiSpacer size="s" />

        {attentionItems.length > 0 ? (
          attentionItems.map((item) => (
            <div key={item.id} css={attentionRowStyle(item.severity)}>
              <div>
                <div css={attentionTitleStyle} title={getAttentionTitle(item)}>
                  {getAttentionTitle(item)}
                </div>
                <div css={attentionMetaStyle}>
                  <EuiBadge color="hollow">{getAttentionSeverityLabel(item.severity)}</EuiBadge>
                  <span>{getAttentionReason(item)}</span>
                </div>
                <EuiButtonEmpty
                  size="xs"
                  iconType="chevronSingleRight"
                  flush="left"
                  onClick={() =>
                    item.linkedEntity ? onInvestigate(item.linkedEntity) : onViewAllEntities()
                  }
                >
                  {item.linkedEntity
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.overview.attention.investigateEntityButtonLabel',
                        { defaultMessage: 'Investigate entity' }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.overview.attention.viewEntitiesButtonLabel',
                        { defaultMessage: 'View entities' }
                      )}
                </EuiButtonEmpty>
              </div>
            </div>
          ))
        ) : (
          <div
            css={css`
              display: flex;
              align-items: flex-start;
              gap: ${euiTheme.size.s};
              padding: ${euiTheme.size.l} 0;
              color: ${euiTheme.colors.textSubdued};
            `}
          >
            <EuiIcon type="checkCircleFill" color="success" aria-hidden={true} />
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.overview.attention.clearDescription',
                  { defaultMessage: 'No material items require immediate attention.' }
                )}
              </p>
            </EuiText>
          </div>
        )}
      </aside>
    </section>
  );
};

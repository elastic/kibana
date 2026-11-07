/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiIconTip, transparentize, useEuiTheme } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EntityType } from '../../../../common/entity_analytics/types';
import { EntityIconByType } from '../../components/entity_store/entity_icon_by_type';
import type { RiskLevel } from './common';
import type { ExecutiveBriefCoverage } from './executive_brief_agents';
import { getRiskLevelColor } from './common';
import type {
  BriefTopRisk,
  ExecutiveKpi,
  KillChainCoverage,
  KpiDelta,
  RiskBandDatum,
  RiskTypeDatum,
} from './overview_metrics';

const KPI_LABELS: Record<ExecutiveKpi['id'], string> = {
  postureScore: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.kpi.postureScoreLabel',
    { defaultMessage: 'Average entity risk' }
  ),
  materialRisk: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.kpi.materialRiskLabel',
    { defaultMessage: 'Material-risk entities' }
  ),
  activeSignals: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.kpi.activeSignalsLabel',
    { defaultMessage: 'Active signals' }
  ),
  tacticsObserved: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.kpi.tacticsObservedLabel',
    { defaultMessage: 'Tactics observed' }
  ),
};

const BAND_LABELS: Record<RiskBandDatum['level'], string> = {
  Critical: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.band.criticalLabel',
    { defaultMessage: 'Critical' }
  ),
  High: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.band.highLabel',
    { defaultMessage: 'High' }
  ),
};

const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  Critical: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.risk.criticalLabel',
    { defaultMessage: 'Critical' }
  ),
  High: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.risk.highLabel',
    { defaultMessage: 'High' }
  ),
  Moderate: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.risk.moderateLabel',
    { defaultMessage: 'Moderate' }
  ),
  Low: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.risk.lowLabel',
    { defaultMessage: 'Low' }
  ),
  Unknown: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.risk.unknownLabel',
    { defaultMessage: 'Unknown' }
  ),
};

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.user]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.entityType.userLabel',
    { defaultMessage: 'User' }
  ),
  [EntityType.host]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.entityType.hostLabel',
    { defaultMessage: 'Host' }
  ),
  [EntityType.service]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.entityType.serviceLabel',
    { defaultMessage: 'Service' }
  ),
  [EntityType.generic]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.entityType.genericLabel',
    { defaultMessage: 'Entity' }
  ),
};

const KPI_STRIP_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.kpiStripLabel',
  { defaultMessage: 'Key metrics' }
);

const RISK_MIX_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.riskMixLabel',
  { defaultMessage: 'Material-risk mix' }
);

const TOP_RISKS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.topRisksLabel',
  { defaultMessage: 'Top exposed entities' }
);

const RISK_BY_TYPE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.riskByTypeLabel',
  { defaultMessage: 'Material risk by type' }
);

const KILL_CHAIN_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.killChainLabel',
  { defaultMessage: 'Observed ATT&CK tactics' }
);

const NO_KILL_CHAIN_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.noKillChainLabel',
  { defaultMessage: 'No MITRE tactics observed in material-risk alerts.' }
);

const COL_ENTITY_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.table.entityLabel',
  { defaultMessage: 'Entity' }
);

const COL_TYPE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.table.typeLabel',
  { defaultMessage: 'Type' }
);

const COL_CRITICALITY_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.table.criticalityLabel',
  { defaultMessage: 'Criticality' }
);

const COL_SCORE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.table.scoreLabel',
  { defaultMessage: 'Risk' }
);

const CRITICALITY_NONE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.criticality.noneLabel',
  { defaultMessage: '—' }
);

/**
 * Maps a raw asset-criticality value (e.g. "high_impact") to a terse label.
 * Falls back to the raw value humanized so an unrecognized level is never
 * dropped — it is real data, just unmapped.
 */
const formatCriticality = (criticality: string | undefined): string => {
  if (!criticality) return CRITICALITY_NONE_LABEL;
  switch (criticality) {
    case 'extreme_impact':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.criticality.extremeLabel',
        { defaultMessage: 'Extreme' }
      );
    case 'high_impact':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.criticality.highLabel',
        { defaultMessage: 'High' }
      );
    case 'medium_impact':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.criticality.mediumLabel',
        { defaultMessage: 'Medium' }
      );
    case 'low_impact':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.criticality.lowLabel',
        { defaultMessage: 'Low' }
      );
    default:
      return criticality.replace(/_/g, ' ');
  }
};

const NO_MATERIAL_RISK_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.noMaterialRiskLabel',
  { defaultMessage: 'No material-risk entities in the current snapshot.' }
);

const NO_TOP_RISKS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.noTopRisksLabel',
  { defaultMessage: 'No scored entities to rank.' }
);

const UNAVAILABLE_EVIDENCE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.brief.metricsUnavailable',
  { defaultMessage: 'Evidence unavailable for this snapshot.' }
);

const INCOMPLETE_EVIDENCE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.brief.metricsIncomplete',
  { defaultMessage: 'Evidence is incomplete for this snapshot.' }
);

const KPI_STRIP_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.kpiStripTooltip',
  {
    defaultMessage:
      'Board-grade metrics drawn from the same real evidence as the Overview: posture score and its trend delta, High/Critical entity count, active hunting leads plus ML anomalies, and MITRE tactics observed. A metric is omitted when it cannot be grounded.',
  }
);

const formatKpiValue = (kpi: ExecutiveKpi): string => {
  if (kpi.value === undefined) return '—';
  return kpi.value.toLocaleString();
};

const getBandColor = (euiTheme: EuiThemeComputed, level: RiskBandDatum['level']): string =>
  level === 'Critical' ? euiTheme.colors.severity.danger : euiTheme.colors.severity.risk;

const getDeltaColor = (euiTheme: EuiThemeComputed, direction: KpiDelta['direction']): string =>
  direction === 'up'
    ? euiTheme.colors.severity.danger
    : direction === 'down'
    ? euiTheme.colors.severity.success
    : euiTheme.colors.textSubdued;

const DELTA_ICON: Record<KpiDelta['direction'], string> = {
  up: 'sortUp',
  down: 'sortDown',
  flat: 'minus',
};

const DeltaIndicator: React.FC<{ delta: KpiDelta }> = ({ delta }) => {
  const { euiTheme } = useEuiTheme();
  const color = getDeltaColor(euiTheme, delta.direction);
  const magnitude = Math.abs(delta.value);
  const label =
    delta.direction === 'flat'
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.kpi.deltaFlatLabel',
          { defaultMessage: 'Flat vs {comparedTo}', values: { comparedTo: delta.comparedTo } }
        )
      : i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.kpi.deltaLabel',
          {
            defaultMessage: '{sign}{magnitude} vs {comparedTo}',
            values: {
              sign: delta.direction === 'up' ? '+' : '−',
              magnitude,
              comparedTo: delta.comparedTo,
            },
          }
        );
  return (
    <span
      css={css`
        display: inline-flex;
        align-items: center;
        gap: ${euiTheme.size.xs};
        margin-top: 2px;
        color: ${color};
        font-size: 11px;
        font-weight: ${euiTheme.font.weight.medium};
      `}
    >
      <EuiIcon type={DELTA_ICON[delta.direction]} size="s" color={color} aria-hidden={true} />
      {label}
    </span>
  );
};

export interface ExecutiveBriefMetricsProps {
  coverage?: ExecutiveBriefCoverage;
  kpis: readonly ExecutiveKpi[];
  riskBands: readonly RiskBandDatum[];
  riskTypes: readonly RiskTypeDatum[];
  killChain: KillChainCoverage;
  topRisks: readonly BriefTopRisk[];
  onSelectEntity?: (entityId: string) => void;
}

/**
 * Board-ready metrics + lightweight visuals rendered alongside the executive
 * brief narrative. Every value is passed in already computed from real Overview
 * data (posture, material-risk bands, top exposures) — this component only
 * presents it and never fetches or fabricates. Shared by the on-screen card and
 * the printable one-pager so both stay in lockstep.
 */
export const ExecutiveBriefMetrics: React.FC<ExecutiveBriefMetricsProps> = ({
  coverage,
  kpis,
  riskBands,
  riskTypes,
  killChain,
  topRisks,
  onSelectEntity,
}) => {
  const { euiTheme } = useEuiTheme();
  const sourceAvailable = (key: keyof ExecutiveBriefCoverage): boolean =>
    coverage === undefined || coverage[key] === 'available';
  const sourceMessage = (key: keyof ExecutiveBriefCoverage): string =>
    coverage?.[key] === 'partial' ? INCOMPLETE_EVIDENCE_LABEL : UNAVAILABLE_EVIDENCE_LABEL;
  const riskAvailable = sourceAvailable('entityStore');
  const detectionsAvailable = sourceAvailable('detections');
  const entitiesAvailable = sourceAvailable('entities');
  const sourceKpis = kpis.map((kpi): ExecutiveKpi => {
    const available =
      kpi.id === 'tacticsObserved'
        ? detectionsAvailable
        : kpi.id === 'activeSignals'
        ? sourceAvailable('anomalies') && sourceAvailable('huntingLeads')
        : riskAvailable;
    return available ? kpi : { ...kpi, value: undefined, delta: undefined };
  });

  const sectionLabelStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    font-size: 10px;
    font-weight: ${euiTheme.font.weight.semiBold};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${euiTheme.colors.textSubdued};
  `;
  const kpiStripStyle = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: ${euiTheme.size.s};
    margin-top: ${euiTheme.size.s};
  `;
  const kpiCellStyle = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border: ${euiTheme.border.width.thin} solid
      ${transparentize(euiTheme.colors.borderBasePlain, 0.6)};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${transparentize(euiTheme.colors.emptyShade, 0.5)};
  `;
  const kpiValueStyle = css`
    font-size: 24px;
    line-height: 1.1;
    font-weight: ${euiTheme.font.weight.bold};
    color: ${euiTheme.colors.textHeading};
    font-variant-numeric: tabular-nums;
  `;
  const kpiLabelStyle = css`
    margin-top: 2px;
    font-size: 11px;
    color: ${euiTheme.colors.textParagraph};
  `;
  const gridStyle = css`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: ${euiTheme.size.l};
    margin-top: ${euiTheme.size.m};

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  `;
  const barRowStyle = css`
    display: grid;
    grid-template-columns: 68px minmax(0, 1fr) auto;
    align-items: center;
    gap: ${euiTheme.size.s};
    margin-top: ${euiTheme.size.s};
    font-size: 11px;
    color: ${euiTheme.colors.textParagraph};
  `;
  const barTrackStyle = css`
    height: ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.small};
    background: ${transparentize(euiTheme.colors.borderBasePlain, 0.4)};
    overflow: hidden;
  `;
  const emptyStyle = css`
    margin-top: ${euiTheme.size.s};
    font-size: 11px;
    color: ${euiTheme.colors.textSubdued};
  `;
  const riskNameStyle = css`
    overflow: hidden;
    color: ${euiTheme.colors.textHeading};
    font-weight: ${euiTheme.font.weight.medium};
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  const riskScoreStyle = (level: RiskLevel) => css`
    color: ${getRiskLevelColor(euiTheme, level)};
    font-weight: ${euiTheme.font.weight.semiBold};
    font-variant-numeric: tabular-nums;
  `;
  const clickableRiskNameStyle = css`
    ${riskNameStyle};
    padding: 0;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      color: ${euiTheme.colors.primary};
      outline: none;
      text-decoration: underline;
    }
  `;
  const killChainStyle = css`
    display: flex;
    flex-wrap: wrap;
    gap: ${euiTheme.size.xs};
    margin-top: ${euiTheme.size.s};
  `;
  const killChainStepStyle = css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 96px;
    flex: 1 1 96px;
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    border: ${euiTheme.border.width.thin} solid ${transparentize(euiTheme.colors.danger, 0.35)};
    border-radius: ${euiTheme.border.radius.small};
    background: ${transparentize(euiTheme.colors.danger, 0.06)};
  `;
  const killChainTacticStyle = css`
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.textHeading};
  `;
  const killChainTechniqueStyle = css`
    overflow: hidden;
    font-size: 10px;
    color: ${euiTheme.colors.textSubdued};
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  const tableStyle = css`
    width: 100%;
    margin-top: ${euiTheme.size.s};
    border-collapse: collapse;
    font-size: 11px;
  `;
  const thStyle = css`
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    border-bottom: ${euiTheme.border.thin};
    color: ${euiTheme.colors.textSubdued};
    font-weight: ${euiTheme.font.weight.semiBold};
    text-align: left;
    white-space: nowrap;
  `;
  const tdStyle = css`
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    border-bottom: ${euiTheme.border.thin};
    color: ${euiTheme.colors.textParagraph};
    vertical-align: middle;
  `;
  const entityCellStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    min-width: 0;
  `;
  const getTypeColor = (type: EntityType): string =>
    type === EntityType.host
      ? euiTheme.colors.severity.danger
      : type === EntityType.user
      ? euiTheme.colors.severity.risk
      : euiTheme.colors.severity.warning;

  return (
    <div data-test-subj="entityIntelligenceExecutiveBriefMetrics">
      <div css={sectionLabelStyle}>
        <span>{KPI_STRIP_LABEL}</span>
        <EuiIconTip type="info" content={KPI_STRIP_TOOLTIP} />
      </div>
      <div css={kpiStripStyle}>
        {sourceKpis.map((kpi) => (
          <div key={kpi.id} css={kpiCellStyle}>
            <div css={kpiValueStyle}>{formatKpiValue(kpi)}</div>
            <div css={kpiLabelStyle}>{KPI_LABELS[kpi.id]}</div>
            {kpi.delta ? <DeltaIndicator delta={kpi.delta} /> : null}
          </div>
        ))}
      </div>

      <div css={{ marginTop: euiTheme.size.m }}>
        <div css={sectionLabelStyle}>
          <span>{KILL_CHAIN_LABEL}</span>
          <EuiIconTip
            type="info"
            content={
              !detectionsAvailable
                ? UNAVAILABLE_EVIDENCE_LABEL
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.killChainTooltip',
                    {
                      defaultMessage:
                        '{observed} of {total} MITRE ATT&CK tactics observed across material-risk alerts in the last 30 days, in kill-chain order.',
                      values: {
                        observed: killChain.observedTacticCount,
                        total: killChain.totalTactics,
                      },
                    }
                  )
            }
          />
        </div>
        {!detectionsAvailable ? (
          <div css={emptyStyle}>{sourceMessage('detections')}</div>
        ) : killChain.steps.length > 0 ? (
          <div css={killChainStyle}>
            {killChain.steps.map((step) => (
              <div key={step.tacticId} css={killChainStepStyle}>
                <span css={killChainTacticStyle}>{step.tacticName}</span>
                <span css={killChainTechniqueStyle} title={step.topTechnique?.name}>
                  {step.topTechnique
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.killChainStepTechnique',
                        {
                          defaultMessage: '{technique} · {count}',
                          values: {
                            technique: step.topTechnique.name,
                            count: step.topTechnique.alertCount,
                          },
                        }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.killChainStepAlerts',
                        {
                          defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
                          values: { count: step.alertCount },
                        }
                      )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div css={emptyStyle}>{NO_KILL_CHAIN_LABEL}</div>
        )}
      </div>

      <div css={gridStyle}>
        <div>
          <div css={sectionLabelStyle}>
            <span>{RISK_MIX_LABEL}</span>
          </div>
          {!riskAvailable ? (
            <div css={emptyStyle}>{sourceMessage('entityStore')}</div>
          ) : riskBands.length > 0 ? (
            riskBands.map((band) => (
              <div key={band.level} css={barRowStyle}>
                <span>{BAND_LABELS[band.level]}</span>
                <span css={barTrackStyle}>
                  <span
                    css={css`
                      display: block;
                      height: 100%;
                      width: ${Math.max(band.percentage, 4)}%;
                      background: ${getBandColor(euiTheme, band.level)};
                    `}
                  />
                </span>
                <span
                  css={css`
                    font-variant-numeric: tabular-nums;
                    font-weight: ${euiTheme.font.weight.semiBold};
                    color: ${euiTheme.colors.textHeading};
                  `}
                >
                  {band.count.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div css={emptyStyle}>{NO_MATERIAL_RISK_LABEL}</div>
          )}

          <div css={[sectionLabelStyle, css({ marginTop: euiTheme.size.m })]}>
            <span>{RISK_BY_TYPE_LABEL}</span>
          </div>
          {!riskAvailable ? (
            <div css={emptyStyle}>{sourceMessage('entityStore')}</div>
          ) : riskTypes.length > 0 ? (
            riskTypes.map((entry) => (
              <div key={entry.type} css={barRowStyle}>
                <span>{ENTITY_TYPE_LABELS[entry.type]}</span>
                <span css={barTrackStyle}>
                  <span
                    css={css`
                      display: block;
                      height: 100%;
                      width: ${Math.max(entry.percentage, 4)}%;
                      background: ${getTypeColor(entry.type)};
                    `}
                  />
                </span>
                <span
                  css={css`
                    font-variant-numeric: tabular-nums;
                    font-weight: ${euiTheme.font.weight.semiBold};
                    color: ${euiTheme.colors.textHeading};
                  `}
                >
                  {entry.count.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div css={emptyStyle}>{NO_MATERIAL_RISK_LABEL}</div>
          )}
        </div>

        <div>
          <div css={sectionLabelStyle}>
            <span>{TOP_RISKS_LABEL}</span>
          </div>
          {!entitiesAvailable ? (
            <div css={emptyStyle}>{sourceMessage('entities')}</div>
          ) : topRisks.length > 0 ? (
            <table css={tableStyle}>
              <thead>
                <tr>
                  <th css={thStyle}>{COL_ENTITY_LABEL}</th>
                  <th css={thStyle}>{COL_TYPE_LABEL}</th>
                  <th css={thStyle}>{COL_CRITICALITY_LABEL}</th>
                  <th css={[thStyle, css({ textAlign: 'right' })]}>{COL_SCORE_LABEL}</th>
                </tr>
              </thead>
              <tbody>
                {topRisks.map((risk) => (
                  <tr key={risk.id}>
                    <td css={tdStyle}>
                      <span css={entityCellStyle}>
                        <EuiIcon
                          type={EntityIconByType[risk.type]}
                          size="s"
                          color={getRiskLevelColor(euiTheme, risk.level)}
                          aria-hidden={true}
                        />
                        {onSelectEntity ? (
                          <button
                            type="button"
                            css={clickableRiskNameStyle}
                            title={risk.name}
                            onClick={() => onSelectEntity(risk.id)}
                          >
                            {risk.name}
                          </button>
                        ) : (
                          <span css={riskNameStyle} title={risk.name}>
                            {risk.name}
                          </span>
                        )}
                      </span>
                    </td>
                    <td css={tdStyle}>{ENTITY_TYPE_LABELS[risk.type]}</td>
                    <td css={tdStyle}>{formatCriticality(risk.criticality)}</td>
                    <td css={[tdStyle, riskScoreStyle(risk.level), css({ textAlign: 'right' })]}>
                      {risk.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div css={emptyStyle}>{NO_TOP_RISKS_LABEL}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export { KPI_LABELS, BAND_LABELS, RISK_LEVEL_LABELS, ENTITY_TYPE_LABELS, formatCriticality };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiIcon,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { useEntityAnalyticsRoutes } from '../../api/api';
import { EntityIconByType } from '../../components/entity_store/entity_icon_by_type';
import { AssetCriticalityBadge } from '../../components/asset_criticality';
import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';
import type { IntelligenceEntity } from './common';
import { getAlertSeverityColor, getRiskLevelColor } from './common';
import { RiskLevelBadge, SectionLabel } from './components';
import { RiskDial, RiskSparkline } from './risk_dial';
import { useEntityRecentAlerts } from './hooks/use_entity_recent_alerts';
import { useCountUp, hoverLift, staggeredEntrance } from './animations';

interface SpotlightHeroProps {
  entity: IntelligenceEntity | undefined;
  isLoading: boolean;
  onInvestigate: (entity: IntelligenceEntity) => void;
}

/**
 * "Most critical entity" spotlight: the single highest-risk entity from the
 * entity store, rendered as the dominant element of the Overview tab with a
 * large risk dial, its top risk contributions, and a drill-in action.
 */
export const SpotlightHero: React.FC<SpotlightHeroProps> = ({
  entity,
  isLoading,
  onInvestigate,
}) => {
  const { euiTheme } = useEuiTheme();
  const { fetchRiskScoreHistory } = useEntityAnalyticsRoutes();

  const { data: history } = useQuery(
    ['entityIntelligenceSpotlightHistory', entity?.type, entity?.id],
    ({ signal }) =>
      entity
        ? fetchRiskScoreHistory({
            signal,
            params: {
              entityType: entity.type,
              entityId: entity.id,
              includeContributions: true,
            },
          })
        : undefined,
    { enabled: !!entity, retry: 1, refetchOnWindowFocus: false }
  );

  const topContributions = useMemo(() => {
    const entries = history?.entries ?? [];
    const latestWithInputs = [...entries]
      .sort((a, b) => new Date(b['@timestamp']).getTime() - new Date(a['@timestamp']).getTime())
      .find((entry) => (entry.inputs?.length ?? 0) > 0);
    return (latestWithInputs?.inputs ?? [])
      .slice()
      .sort(
        (a, b) =>
          (b.contribution_score ?? b.risk_score ?? 0) - (a.contribution_score ?? a.risk_score ?? 0)
      )
      .slice(0, 3);
  }, [history?.entries]);

  const sparklineValues = useMemo(() => {
    const entries = history?.entries ?? [];
    return [...entries]
      .sort((a, b) => new Date(a['@timestamp']).getTime() - new Date(b['@timestamp']).getTime())
      .map((entry) => entry.calculated_score_norm);
  }, [history?.entries]);

  const { alerts, totalAlerts, isLoading: isAlertsLoading } = useEntityRecentAlerts(entity);

  const animatedScore = useCountUp(entity?.riskScoreNorm);

  const accent = entity
    ? getRiskLevelColor(euiTheme, entity.riskLevel)
    : euiTheme.colors.severity.unknown;

  const heroStyle = css`
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(280px, 1.2fr) minmax(300px, 1fr) auto;
    gap: ${euiTheme.size.xl};
    align-items: center;
    padding: ${euiTheme.size.l} ${euiTheme.size.xl};
    background: linear-gradient(
      120deg,
      ${transparentize(accent, 0.1)} 0%,
      ${transparentize(accent, 0.03)} 55%,
      transparent 100%
    );
    border: ${euiTheme.border.width.thin} solid ${transparentize(accent, 0.35)};
    border-radius: ${euiTheme.border.radius.medium};
    overflow: hidden;

    @media (max-width: 1100px) {
      grid-template-columns: auto 1fr;
      grid-auto-rows: auto;
    }

    &::after {
      content: '';
      position: absolute;
      top: -70%;
      left: -6%;
      width: 34%;
      height: 240%;
      background: radial-gradient(
        ellipse at center,
        ${transparentize(accent, 0.14)} 0%,
        transparent 70%
      );
      pointer-events: none;
    }
  `;

  const zoneStyle = css`
    min-width: 0;
    position: relative;
    z-index: 1;
  `;

  const dialColumnStyle = css`
    ${zoneStyle};
    flex: 0 0 auto;
  `;

  const nameRowStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.m};
    flex-wrap: wrap;
  `;

  const nameStyle = css`
    margin: 0;
    font-size: 26px;
    line-height: 1.2;
    font-weight: ${euiTheme.font.weight.bold};
    color: ${euiTheme.colors.textHeading};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  `;

  const factsGridStyle = css`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: ${euiTheme.size.xs} ${euiTheme.size.l};
    margin-top: ${euiTheme.size.m};
  `;

  const factLabelStyle = css`
    font-size: 10px;
    font-weight: ${euiTheme.font.weight.semiBold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${euiTheme.colors.textSubdued};
  `;

  const factValueStyle = css`
    font-size: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.medium};
    font-variant-numeric: tabular-nums;
    color: ${euiTheme.colors.textParagraph};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  const evidenceRowStyle = css`
    display: flex;
    align-items: baseline;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.xs} 0;

    & + & {
      border-top: ${euiTheme.border.width.thin} solid ${transparentize(accent, 0.15)};
    }
  `;

  const evidenceScoreStyle = css`
    margin-left: auto;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    font-weight: ${euiTheme.font.weight.semiBold};
    font-size: ${euiTheme.size.m};
    color: ${euiTheme.colors.textParagraph};
  `;

  const evidenceTextStyle = css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  const severityDotStyle = (color: string) => css`
    flex-shrink: 0;
    align-self: center;
    width: ${euiTheme.size.s};
    height: ${euiTheme.size.s};
    border-radius: 50%;
    background: ${color};
  `;

  const actionsColumnStyle = css`
    ${zoneStyle};
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
    align-items: stretch;
  `;

  if (isLoading) {
    return (
      <div css={heroStyle} data-test-subj="entityIntelligenceSpotlightLoading">
        <EuiSkeletonRectangle width={148} height={148} borderRadius="m" />
        <div css={zoneStyle}>
          <EuiSkeletonText lines={4} />
        </div>
        <div css={zoneStyle}>
          <EuiSkeletonText lines={4} />
        </div>
      </div>
    );
  }

  if (!entity) {
    return null;
  }

  const evidenceHasContributions = topContributions.length > 0;

  return (
    <div css={[heroStyle, staggeredEntrance(0)]} data-test-subj="entityIntelligenceSpotlight">
      <div css={dialColumnStyle}>
        <RiskDial score={animatedScore} level={entity.riskLevel} size="l" />
      </div>

      <div css={zoneStyle}>
        <SectionLabel>
          {i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.spotlight.title', {
            defaultMessage: 'Most critical entity',
          })}
        </SectionLabel>
        <EuiSpacer size="xs" />
        <div css={nameRowStyle}>
          <EuiIcon
            type={EntityIconByType[entity.type]}
            size="l"
            color="primary"
            aria-hidden={true}
          />
          <h2 css={nameStyle} title={entity.name}>
            {entity.name}
          </h2>
          <RiskLevelBadge level={entity.riskLevel} />
          {entity.criticality && entity.criticality !== 'unassigned' ? (
            <AssetCriticalityBadge
              criticalityLevel={entity.criticality as CriticalityLevelWithUnassigned}
            />
          ) : null}
        </div>
        <div css={factsGridStyle}>
          <div>
            <div css={factLabelStyle}>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.spotlight.factType',
                { defaultMessage: 'Type' }
              )}
            </div>
            <div css={factValueStyle}>{entity.type}</div>
          </div>
          <div>
            <div css={factLabelStyle}>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.spotlight.factLastSeen',
                { defaultMessage: 'Last seen' }
              )}
            </div>
            <div css={factValueStyle}>
              {entity.lastSeen ? <FormattedRelativePreferenceDate value={entity.lastSeen} /> : '—'}
            </div>
          </div>
          <div>
            <div css={factLabelStyle}>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.spotlight.factOpenAlerts',
                { defaultMessage: 'Alerts (90d)' }
              )}
            </div>
            <div css={factValueStyle}>{isAlertsLoading ? '…' : totalAlerts.toLocaleString()}</div>
          </div>
          <div>
            <div css={factLabelStyle}>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.spotlight.factSource',
                { defaultMessage: 'Source' }
              )}
            </div>
            <div css={factValueStyle}>{entity.source ?? '—'}</div>
          </div>
        </div>
      </div>

      <div css={zoneStyle}>
        <SectionLabel>
          {evidenceHasContributions
            ? i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.spotlight.contributionsTitle',
                { defaultMessage: 'Top risk contributions' }
              )
            : i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.spotlight.recentAlertsTitle',
                { defaultMessage: 'Latest alerts' }
              )}
        </SectionLabel>
        <EuiSpacer size="xs" />
        {evidenceHasContributions ? (
          topContributions.map((input) => (
            <div key={input.id} css={evidenceRowStyle}>
              <EuiIcon type="dot" size="s" color={accent} aria-hidden={true} />
              <EuiText size="xs" css={evidenceTextStyle}>
                <span title={input.description}>{input.description}</span>
              </EuiText>
              <span css={evidenceScoreStyle}>
                {(input.contribution_score ?? input.risk_score ?? 0).toFixed(1)}
              </span>
            </div>
          ))
        ) : isAlertsLoading ? (
          <EuiSkeletonText lines={3} />
        ) : alerts.length > 0 ? (
          alerts.slice(0, 3).map((alert) => (
            <div key={alert.id} css={evidenceRowStyle}>
              <span css={severityDotStyle(getAlertSeverityColor(euiTheme, alert.severity))} />
              <EuiText size="xs" css={evidenceTextStyle}>
                <span title={alert.ruleName}>{alert.ruleName}</span>
              </EuiText>
              {alert.timestamp ? (
                <span css={evidenceScoreStyle}>
                  <FormattedRelativePreferenceDate value={alert.timestamp} />
                </span>
              ) : null}
            </div>
          ))
        ) : (
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.spotlight.noEvidence',
                { defaultMessage: 'No risk contributions or recent alerts for this entity yet.' }
              )}
            </p>
          </EuiText>
        )}
        {sparklineValues.length >= 2 ? (
          <>
            <EuiSpacer size="s" />
            <div css={factLabelStyle}>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.spotlight.riskTrend',
                { defaultMessage: 'Risk trend' }
              )}
            </div>
            <EuiSpacer size="xs" />
            <RiskSparkline values={sparklineValues} color={accent} height={32} />
          </>
        ) : null}
      </div>

      <div css={actionsColumnStyle}>
        <EuiButton
          fill
          iconType="inspect"
          onClick={() => onInvestigate(entity)}
          data-test-subj="entityIntelligenceSpotlightInvestigate"
        >
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.spotlight.investigate',
            { defaultMessage: 'Investigate' }
          )}
        </EuiButton>
      </div>
    </div>
  );
};

interface CriticalEntitiesStripProps {
  entities: IntelligenceEntity[];
  isLoading: boolean;
  onSelect: (entity: IntelligenceEntity) => void;
}

/** Compact clickable cards for the next riskiest entities below the spotlight. */
export const CriticalEntitiesStrip: React.FC<CriticalEntitiesStripProps> = ({
  entities,
  isLoading,
  onSelect,
}) => {
  const { euiTheme } = useEuiTheme();

  const stripStyle = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: ${euiTheme.size.s};
  `;

  const cardStyle = (accent: string) => css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    background: ${euiTheme.colors.emptyShade};
    border: ${euiTheme.border.thin};
    border-left: 3px solid ${accent};
    border-radius: ${euiTheme.border.radius.medium};
    cursor: pointer;
    text-align: left;
    min-width: 0;
  `;

  const nameStyle = css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.medium};
    color: ${euiTheme.colors.textParagraph};
  `;

  const scoreStyle = (accent: string) => css`
    flex-shrink: 0;
    font-size: 16px;
    font-weight: ${euiTheme.font.weight.bold};
    font-variant-numeric: tabular-nums;
    color: ${accent};
  `;

  if (isLoading) {
    return (
      <div css={stripStyle}>
        {Array.from({ length: 5 }, (_, index) => (
          <EuiSkeletonRectangle key={index} width="100%" height={44} borderRadius="m" />
        ))}
      </div>
    );
  }

  if (!entities.length) {
    return null;
  }

  return (
    <div css={stripStyle} data-test-subj="entityIntelligenceCriticalStrip">
      {entities.map((entity, index) => {
        const accent = getRiskLevelColor(euiTheme, entity.riskLevel);
        return (
          <button
            key={entity.id}
            type="button"
            css={[cardStyle(accent), hoverLift(euiTheme), staggeredEntrance(index + 1)]}
            onClick={() => onSelect(entity)}
            title={entity.name}
            data-test-subj={`entityIntelligenceCriticalStripItem-${index}`}
          >
            <EuiIcon
              type={EntityIconByType[entity.type]}
              size="m"
              color="subdued"
              aria-hidden={true}
            />
            <span css={nameStyle}>{entity.name}</span>
            <span css={scoreStyle(accent)}>
              {entity.riskScoreNorm !== undefined ? Math.round(entity.riskScoreNorm) : '—'}
            </span>
          </button>
        );
      })}
    </div>
  );
};

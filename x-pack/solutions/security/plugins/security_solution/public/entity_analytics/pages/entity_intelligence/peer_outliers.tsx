/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiIcon,
  EuiIconTip,
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
import type { IntelligenceEntity } from './common';
import { getRiskLevelColor } from './common';
import { findEmergingEntities, findPeerOutliers } from './overview_metrics';
import { staggeredEntrance } from './animations';

/** Freshness window for "emerged" material-risk entities. */
const EMERGENCE_WINDOW_MS = 24 * 60 * 60 * 1000;

const TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.user]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.usersLabel',
    { defaultMessage: 'user' }
  ),
  [EntityType.host]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.hostsLabel',
    { defaultMessage: 'host' }
  ),
  [EntityType.service]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.servicesLabel',
    { defaultMessage: 'service' }
  ),
  [EntityType.generic]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.otherLabel',
    { defaultMessage: 'entity' }
  ),
};

const formatRelativeAge = (ageMs: number): string => {
  const minutes = Math.round(ageMs / (60 * 1000));
  if (minutes < 60) {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.minutesAgoLabel',
      {
        defaultMessage: '{minutes, plural, one {# minute} other {# minutes}} ago',
        values: { minutes: Math.max(1, minutes) },
      }
    );
  }
  const hours = Math.round(minutes / 60);
  return i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.hoursAgoLabel',
    {
      defaultMessage: '{hours, plural, one {# hour} other {# hours}} ago',
      values: { hours },
    }
  );
};

/** Shortest scannable freshness token for the emergence pill (e.g. "53m", "3h"). */
const formatCompactAge = (ageMs: number): string => {
  const minutes = Math.max(1, Math.round(ageMs / (60 * 1000)));
  if (minutes < 60) {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.minutesCompactLabel',
      { defaultMessage: '{minutes}m', values: { minutes } }
    );
  }
  return i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.hoursCompactLabel',
    { defaultMessage: '{hours}h', values: { hours: Math.round(minutes / 60) } }
  );
};

interface PeerOutliersProps {
  entities: readonly IntelligenceEntity[];
  isLoading: boolean;
  onSelect: (entity: IntelligenceEntity) => void;
}

/**
 * Two evidence-backed lenses on the current entity snapshot:
 *  - Peer outliers: entities whose risk sits well above the median of their own
 *    type in this sample ("unusual for a host/user").
 *  - Emerged in 24h: material-risk entities the store observed in the freshness
 *    window.
 * Both derive purely from already-fetched entity-store records; neither models
 * or predicts anything.
 */
export const PeerOutliers: React.FC<PeerOutliersProps> = ({ entities, isLoading, onSelect }) => {
  const { euiTheme } = useEuiTheme();

  const outliers = useMemo(() => findPeerOutliers(entities), [entities]);
  const emerging = useMemo(
    () => findEmergingEntities({ entities, windowMs: EMERGENCE_WINDOW_MS, now: Date.now() }),
    [entities]
  );

  // The busiest deviation in the current list anchors every delta gauge so the
  // widest bar always reads full and the rest scale relative to it.
  const maxDelta = useMemo(
    () => outliers.reduce((max, { deltaFromMedian }) => Math.max(max, deltaFromMedian), 0),
    [outliers]
  );

  const sectionStyle = css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
    padding: ${euiTheme.size.l};
    border-radius: ${euiTheme.border.radius.medium};
    background: linear-gradient(
      145deg,
      ${transparentize(euiTheme.colors.accent, 0.03)},
      ${euiTheme.colors.emptyShade} 55%
    );
    box-shadow: inset 0 0 0 1px ${transparentize(euiTheme.colors.borderBasePlain, 0.55)};
  `;
  const headerStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
  `;

  // Each subhead carries a distinct accent so the two lenses never read as the
  // same list: peer deviation leans on the accent palette + gauge iconography,
  // emergence on a warm "freshness" tone + clock.
  const subheadStyle = (accent: string) => css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    margin: ${euiTheme.size.l} 0 ${euiTheme.size.xs};
    color: ${euiTheme.colors.textParagraph};
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.semiBold};
    letter-spacing: 0.04em;
    text-transform: uppercase;

    &::before {
      content: '';
      flex: none;
      width: ${euiTheme.size.xs};
      height: ${euiTheme.size.base};
      border-radius: ${euiTheme.border.radius.small};
      background: ${accent};
    }
  `;
  const subheadIconStyle = (accent: string) => css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: ${euiTheme.size.l};
    height: ${euiTheme.size.l};
    border-radius: 50%;
    background: ${transparentize(accent, 0.12)};
    color: ${accent};
  `;
  const rowStyle = (accent: string) => css`
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: ${euiTheme.size.m};
    width: 100%;
    padding: ${euiTheme.size.s} 0;
    border: 0;
    border-bottom: ${euiTheme.border.thin};
    background: transparent;
    color: ${euiTheme.colors.textParagraph};
    text-align: left;
    cursor: pointer;
    transition: background-color ${euiTheme.animation.fast} ease;

    &:hover,
    &:focus-visible {
      color: ${euiTheme.colors.primaryText};
      background: ${transparentize(accent, 0.05)};
      outline: none;

      [data-entity-icon] {
        border-color: ${accent};
        color: ${accent};
      }
    }
  `;
  const iconWrapperStyle = (accent: string) => css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: ${euiTheme.size.xl};
    height: ${euiTheme.size.xl};
    border: ${euiTheme.border.thin};
    border-radius: 50%;
    color: ${euiTheme.colors.textSubdued};
    transition: color ${euiTheme.animation.fast} ease, border-color ${euiTheme.animation.fast} ease;
    /* Severity-tinted rail on the leading edge keeps each row's risk scannable. */
    box-shadow: inset ${euiTheme.size.xxs} 0 0 -1px ${accent};
  `;
  const identityStyle = css`
    min-width: 0;
  `;
  const nameStyle = css`
    display: block;
    overflow: hidden;
    color: ${euiTheme.colors.textHeading};
    font-size: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.semiBold};
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  const metaRowStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    margin-top: ${euiTheme.size.xxs};
    color: ${euiTheme.colors.textSubdued};
    font-size: 11px;
  `;
  const metaSeparatorStyle = css`
    color: ${euiTheme.colors.textSubdued};
    opacity: 0.6;
  `;
  const gaugeTrackStyle = css`
    flex: none;
    width: 44px;
    height: ${euiTheme.size.xs};
    border-radius: ${euiTheme.border.radius.small};
    background: ${transparentize(euiTheme.colors.borderBasePlain, 0.55)};
    overflow: hidden;
  `;
  const gaugeFillStyle = (accent: string, ratio: number) => css`
    display: block;
    width: ${Math.round(ratio * 100)}%;
    height: 100%;
    border-radius: inherit;
    background: ${accent};
  `;
  const freshnessPillStyle = (accent: string) => css`
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.xxs};
    padding: ${euiTheme.size.xxs} ${euiTheme.size.xs};
    border-radius: ${euiTheme.border.radius.small};
    background: ${transparentize(accent, 0.12)};
    color: ${accent};
    font-weight: ${euiTheme.font.weight.semiBold};
    font-variant-numeric: tabular-nums;
  `;
  const scoreStyle = (color: string) => css`
    color: ${color};
    font-size: 20px;
    font-weight: ${euiTheme.font.weight.bold};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  `;
  const emptyStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.m} 0;
    color: ${euiTheme.colors.textSubdued};
    font-size: ${euiTheme.size.m};
  `;

  const peerAccent = euiTheme.colors.accent;
  const emergenceAccent = euiTheme.colors.severity.warning;

  return (
    <section
      css={[sectionStyle, staggeredEntrance(5)]}
      data-test-subj="entityIntelligencePeerOutliers"
    >
      <div css={headerStyle}>
        <EuiTitle size="xs">
          <h2>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.title',
              { defaultMessage: 'Outliers & emergence' }
            )}
          </h2>
        </EuiTitle>
        <EuiIconTip
          type="info"
          content={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.tooltip',
            {
              defaultMessage:
                'Peer outliers are entities whose normalized risk is at least 20 points above the median for their own type in the current snapshot (a type needs at least 4 scored members to qualify). Emerged entities are high or critical entities the entity store last observed within the past 24 hours.',
            }
          )}
        />
      </div>

      {isLoading ? (
        <>
          <EuiSpacer size="m" />
          <EuiSkeletonText lines={4} />
        </>
      ) : (
        <>
          <div css={subheadStyle(peerAccent)}>
            <span css={subheadIconStyle(peerAccent)}>
              <EuiIcon type="visGauge" size="s" aria-hidden={true} />
            </span>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.peerSectionLabel',
              { defaultMessage: 'Unusual for their peer group' }
            )}
          </div>
          {outliers.length > 0 ? (
            outliers.map(({ entity, typeMedian, deltaFromMedian, peerCount }) => {
              const color = getRiskLevelColor(euiTheme, entity.riskLevel);
              const gaugeRatio = maxDelta > 0 ? Math.min(1, deltaFromMedian / maxDelta) : 0;
              const roundedDelta = Math.round(deltaFromMedian);
              return (
                <button
                  key={`outlier:${entity.id}`}
                  type="button"
                  css={rowStyle(peerAccent)}
                  onClick={() => onSelect(entity)}
                  data-test-subj={`entityIntelligencePeerOutlier-${entity.id}`}
                >
                  <span css={iconWrapperStyle(color)} data-entity-icon>
                    <EuiIcon type={EntityIconByType[entity.type]} aria-hidden={true} />
                  </span>
                  <span css={identityStyle}>
                    <span css={nameStyle} title={entity.name}>
                      {entity.name}
                    </span>
                    <span css={metaRowStyle}>
                      <span css={freshnessPillStyle(peerAccent)}>
                        {i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.peerDeltaBadge',
                          {
                            defaultMessage: '+{delta}',
                            values: { delta: roundedDelta },
                          }
                        )}
                      </span>
                      <span css={gaugeTrackStyle} aria-hidden="true">
                        <span css={gaugeFillStyle(peerAccent, gaugeRatio)} />
                      </span>
                      <span>
                        {i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.peerMetaDescription',
                          {
                            defaultMessage: 'above the {type} median ({median}) · {peers} peers',
                            values: {
                              type: TYPE_LABELS[entity.type],
                              median: Math.round(typeMedian),
                              peers: peerCount,
                            },
                          }
                        )}
                      </span>
                    </span>
                  </span>
                  <span css={scoreStyle(color)}>
                    {entity.riskScoreNorm === undefined ? '—' : Math.round(entity.riskScoreNorm)}
                  </span>
                </button>
              );
            })
          ) : (
            <div css={emptyStyle}>
              <EuiIcon type="checkCircleFill" color="success" size="s" aria-hidden={true} />
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.noPeerOutliersDescription',
                { defaultMessage: 'No entity stands out from its peer group.' }
              )}
            </div>
          )}

          <div css={subheadStyle(emergenceAccent)}>
            <span css={subheadIconStyle(emergenceAccent)}>
              <EuiIcon type="clock" size="s" aria-hidden={true} />
            </span>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.emergingSectionLabel',
              { defaultMessage: 'Emerged in the last 24h' }
            )}
          </div>
          {emerging.length > 0 ? (
            emerging.map(({ entity, ageMs }) => {
              const color = getRiskLevelColor(euiTheme, entity.riskLevel);
              return (
                <button
                  key={`emerging:${entity.id}`}
                  type="button"
                  css={rowStyle(emergenceAccent)}
                  onClick={() => onSelect(entity)}
                  data-test-subj={`entityIntelligenceEmergingEntity-${entity.id}`}
                >
                  <span css={iconWrapperStyle(color)} data-entity-icon>
                    <EuiIcon type={EntityIconByType[entity.type]} aria-hidden={true} />
                  </span>
                  <span css={identityStyle}>
                    <span css={nameStyle} title={entity.name}>
                      {entity.name}
                    </span>
                    <span css={metaRowStyle}>
                      <span
                        css={freshnessPillStyle(emergenceAccent)}
                        title={formatRelativeAge(ageMs)}
                      >
                        <EuiIcon type="clock" size="s" aria-hidden={true} />
                        {formatCompactAge(ageMs)}
                      </span>
                      <span>{TYPE_LABELS[entity.type]}</span>
                      <span css={metaSeparatorStyle}>{'·'}</span>
                      <span>
                        {i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.emergingFirstSurfacedLabel',
                          {
                            defaultMessage: 'first surfaced {age}',
                            values: { age: formatRelativeAge(ageMs) },
                          }
                        )}
                      </span>
                    </span>
                  </span>
                  <span css={scoreStyle(color)}>
                    {entity.riskScoreNorm === undefined ? '—' : Math.round(entity.riskScoreNorm)}
                  </span>
                </button>
              );
            })
          ) : (
            <div css={emptyStyle}>
              <EuiIcon type="checkCircleFill" color="success" size="s" aria-hidden={true} />
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.noEmergingDescription',
                { defaultMessage: 'No new material-risk entities in the last 24 hours.' }
              )}
            </div>
          )}
        </>
      )}

      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.overview.outliers.footnoteDescription',
            {
              defaultMessage:
                'Compared within the highest-risk entities in the current snapshot; not a historical baseline.',
            }
          )}
        </p>
      </EuiText>
    </section>
  );
};

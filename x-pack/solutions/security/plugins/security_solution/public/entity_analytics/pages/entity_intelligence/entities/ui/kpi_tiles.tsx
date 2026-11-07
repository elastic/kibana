/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { KpiTile } from '../kpi_model';
import type { TileSize, TriageTileKey } from '../types';
import { Sparkline } from './sparkline';
import { DeltaText } from './delta_text';

const I18N_PREFIX = 'xpack.securitySolution.entityAnalytics.intelligence.entities';

/** i18n labels for each tile key (expanded + compact). */
const tileLabel = (key: string): { long: string; short: string; sub: string } => {
  switch (key) {
    case 'highrisk':
      return {
        long: i18n.translate(`${I18N_PREFIX}.tiles.highRisk`, {
          defaultMessage: 'High-risk entities',
        }),
        short: i18n.translate(`${I18N_PREFIX}.tiles.highRiskShort`, {
          defaultMessage: 'High-risk',
        }),
        sub: i18n.translate(`${I18N_PREFIX}.tiles.highRiskSub`, {
          defaultMessage: 'Risk level High or Critical',
        }),
      };
    case 'untriaged':
      return {
        long: i18n.translate(`${I18N_PREFIX}.tiles.untriaged`, {
          defaultMessage: 'Untriaged high-risk entities',
        }),
        short: i18n.translate(`${I18N_PREFIX}.tiles.untriagedShort`, {
          defaultMessage: 'Untriaged',
        }),
        sub: i18n.translate(`${I18N_PREFIX}.tiles.untriagedSub`, {
          defaultMessage: 'High or Critical with no case yet',
        }),
      };
    case 'firsthigh':
      return {
        long: i18n.translate(`${I18N_PREFIX}.tiles.firstHigh`, {
          defaultMessage: 'First-time High/Critical entities',
        }),
        short: i18n.translate(`${I18N_PREFIX}.tiles.firstHighShort`, {
          defaultMessage: '1st High/Crit',
        }),
        sub: i18n.translate(`${I18N_PREFIX}.tiles.firstHighSub`, {
          defaultMessage: 'Never High or Critical before this window',
        }),
      };
    case 'newrule':
      return {
        long: i18n.translate(`${I18N_PREFIX}.tiles.newRule`, {
          defaultMessage: 'New rule for entity',
        }),
        short: i18n.translate(`${I18N_PREFIX}.tiles.newRuleShort`, { defaultMessage: 'New rule' }),
        sub: i18n.translate(`${I18N_PREFIX}.tiles.newRuleSub`, {
          defaultMessage: 'Alerting on a rule not seen before this window',
        }),
      };
    case 'newalerted':
      return {
        long: i18n.translate(`${I18N_PREFIX}.tiles.newAlerted`, {
          defaultMessage: 'New entities · already alerting',
        }),
        short: i18n.translate(`${I18N_PREFIX}.tiles.newAlertedShort`, {
          defaultMessage: 'New · alerting',
        }),
        sub: i18n.translate(`${I18N_PREFIX}.tiles.newAlertedSub`, {
          defaultMessage: 'First seen within this window',
        }),
      };
    case 'watchlisted':
      return {
        long: i18n.translate(`${I18N_PREFIX}.tiles.watchlisted`, {
          defaultMessage: 'Watchlisted entities',
        }),
        short: i18n.translate(`${I18N_PREFIX}.tiles.watchlistedShort`, {
          defaultMessage: 'Watchlist',
        }),
        sub: i18n.translate(`${I18N_PREFIX}.tiles.watchlistedSub`, {
          defaultMessage: 'On at least one watchlist',
        }),
      };
    case 'new-entities':
      return {
        long: i18n.translate(`${I18N_PREFIX}.tiles.newEntities`, {
          defaultMessage: 'New entities',
        }),
        short: i18n.translate(`${I18N_PREFIX}.tiles.newEntitiesShort`, { defaultMessage: 'New' }),
        sub: i18n.translate(`${I18N_PREFIX}.tiles.newEntitiesSub`, {
          defaultMessage: 'First seen in window',
        }),
      };
    case 'entities-with-alerts':
      return {
        long: i18n.translate(`${I18N_PREFIX}.tiles.withAlerts`, {
          defaultMessage: 'Entities with alerts',
        }),
        short: i18n.translate(`${I18N_PREFIX}.tiles.withAlertsShort`, {
          defaultMessage: 'Alerted',
        }),
        sub: i18n.translate(`${I18N_PREFIX}.tiles.withAlertsSub`, {
          defaultMessage: 'At least one open alert',
        }),
      };
    case 'entities-with-anomalies':
      return {
        long: i18n.translate(`${I18N_PREFIX}.tiles.withAnomalies`, {
          defaultMessage: 'Entities with anomalies',
        }),
        short: i18n.translate(`${I18N_PREFIX}.tiles.withAnomaliesShort`, {
          defaultMessage: 'Anomalous',
        }),
        sub: i18n.translate(`${I18N_PREFIX}.tiles.withAnomaliesSub`, {
          defaultMessage: 'At least one ML anomaly',
        }),
      };
    case 'daily-active':
      return {
        long: i18n.translate(`${I18N_PREFIX}.tiles.dailyActive`, {
          defaultMessage: 'Daily active entities',
        }),
        short: i18n.translate(`${I18N_PREFIX}.tiles.dailyActiveShort`, {
          defaultMessage: 'Active',
        }),
        sub: i18n.translate(`${I18N_PREFIX}.tiles.dailyActiveSub`, {
          defaultMessage: 'Distinct entities scored per day',
        }),
      };
    default:
      return { long: key, short: key, sub: '' };
  }
};

export interface KpiTilesProps {
  tiles: KpiTile[];
  size: TileSize;
  activeTileFilter: TriageTileKey | null;
  onToggleTile: (key: TriageTileKey) => void;
}

/**
 * The KPI stat strip. Deliberately flat and quiet: a single low-chrome row of
 * `label / value` stats divided by hairlines, so it reads as a calm summary
 * bar rather than a wall of competing cards. Color is signal-only — a small
 * danger dot appears before a stat's value ONLY when it is an actionable risk
 * metric with a non-zero population; everything else stays neutral. Actionable
 * stats are clickable to filter the table; the active one gets a subtle neutral
 * emphasis (background + bottom accent), never a bright card.
 */
export const KpiTiles: React.FC<KpiTilesProps> = ({
  tiles,
  size,
  activeTileFilter,
  onToggleTile,
}) => {
  const { euiTheme } = useEuiTheme();
  const compact = size === 'short';

  const stripStyle = css`
    display: grid;
    grid-template-columns: repeat(${tiles.length}, minmax(0, 1fr));
    align-items: stretch;
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.backgroundBaseSubdued};
    overflow: hidden;

    @media (max-width: 1100px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  `;

  const handleKey = useCallback(
    (event: React.KeyboardEvent, key: TriageTileKey | null) => {
      if (key && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onToggleTile(key);
      }
    },
    [onToggleTile]
  );

  return (
    <div css={stripStyle} data-test-subj="entityIntelligenceEntitiesKpiTiles" role="group">
      {tiles.map((tile, index) => {
        const labels = tileLabel(tile.key);
        const isFilter = tile.filterKey !== null;
        const on = isFilter && activeTileFilter === tile.filterKey;
        // Signal-only accent: a danger dot for an actionable risk stat that
        // actually has a population right now. Nothing else gets color.
        const urgent =
          isFilter && tile.direction === 'up-bad' && tile.value !== undefined && tile.value > 0;

        const cellStyle = css`
          position: relative;
          display: flex;
          flex-direction: column;
          gap: ${compact ? '2px' : euiTheme.size.xs};
          justify-content: center;
          min-width: 0;
          padding: ${compact
            ? `${euiTheme.size.xs} ${euiTheme.size.m}`
            : `${euiTheme.size.m} ${euiTheme.size.base}`};
          border-left: ${index === 0
            ? 'none'
            : `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`};
          background: ${on ? euiTheme.colors.backgroundBasePlain : 'transparent'};
          cursor: ${isFilter ? 'pointer' : 'default'};
          transition: background-color ${euiTheme.animation.fast} ease;

          /* Active stat: quiet neutral emphasis via a bottom accent, no card. */
          &::after {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 2px;
            background: ${on ? euiTheme.colors.textParagraph : 'transparent'};
          }

          ${isFilter
            ? `&:hover { background: ${transparentize(euiTheme.colors.textParagraph, 0.96)}; }`
            : ''}
          &:focus-visible {
            outline: 2px solid ${euiTheme.colors.primary};
            outline-offset: -2px;
          }
        `;

        const labelStyle = css`
          font-size: 10px;
          line-height: 1.2;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: ${euiTheme.colors.textSubdued};
          font-weight: ${euiTheme.font.weight.medium};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        `;

        const valueStyle = css`
          font-size: ${compact ? '16px' : '22px'};
          font-weight: ${euiTheme.font.weight.bold};
          line-height: 1.05;
          letter-spacing: -0.01em;
          font-variant-numeric: tabular-nums;
          color: ${euiTheme.colors.textHeading};
        `;

        const value = (
          <span
            css={css`
              display: inline-flex;
              align-items: center;
              gap: 6px;
              min-width: 0;
            `}
          >
            {urgent ? (
              <span
                aria-hidden="true"
                css={css`
                  flex: none;
                  width: 6px;
                  height: 6px;
                  border-radius: 50%;
                  background: ${euiTheme.colors.danger};
                `}
              />
            ) : null}
            <span css={valueStyle}>
              {tile.value === undefined ? '—' : tile.value.toLocaleString()}
            </span>
          </span>
        );

        return (
          <div
            key={tile.key}
            css={cellStyle}
            role={isFilter ? 'button' : undefined}
            tabIndex={isFilter ? 0 : undefined}
            aria-pressed={isFilter ? on : undefined}
            title={compact ? labels.long : labels.sub}
            onClick={isFilter ? () => onToggleTile(tile.filterKey as TriageTileKey) : undefined}
            onKeyDown={(event) => handleKey(event, tile.filterKey)}
            data-test-subj={`entityIntelligenceEntitiesTile-${tile.key}`}
          >
            <span css={labelStyle}>{compact ? labels.short : labels.long}</span>
            <div
              css={css`
                display: flex;
                align-items: baseline;
                gap: ${euiTheme.size.s};
                min-width: 0;
              `}
            >
              {value}
              {tile.delta !== undefined ? (
                <DeltaText
                  value={tile.delta}
                  invert={tile.direction === 'up-bad'}
                  neutral={tile.direction === 'neutral'}
                />
              ) : null}
              {!compact && tile.series ? (
                <span
                  css={css`
                    margin-left: auto;
                    display: inline-flex;
                    align-items: flex-end;
                  `}
                >
                  <Sparkline values={tile.series} />
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

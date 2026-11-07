/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiIcon, EuiToolTip, transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getRiskLevelColor } from '../../common';
import type { ColumnDef, EntityColumnId, EntityRow, SortState, TrendWindow } from '../types';
import { uncasedOf } from '../entities_logic';
import { evidenceKindForColumn, hasEvidence } from '../evidence';
import { criticalityLabel, isRecent, relativeTime } from '../presentation';
import { EntityAvatar } from './entity_avatar';
import { DeltaText } from './delta_text';

const I18N_PREFIX = 'xpack.securitySolution.entityAnalytics.intelligence.entities';
const HOUR = 3_600_000;
const MIN = 60_000;

/** Localized header labels + tooltips per column. */
const columnHeader = (id: EntityColumnId): { label: string; tip?: string } => {
  switch (id) {
    case 'name':
      return { label: i18n.translate(`${I18N_PREFIX}.col.name`, { defaultMessage: 'Name' }) };
    case 'criticality':
      return {
        label: i18n.translate(`${I18N_PREFIX}.col.criticality`, { defaultMessage: 'Criticality' }),
        tip: i18n.translate(`${I18N_PREFIX}.col.criticalityTip`, {
          defaultMessage: 'Asset criticality — analyst-assigned business impact.',
        }),
      };
    case 'risk':
      return {
        label: i18n.translate(`${I18N_PREFIX}.col.risk`, { defaultMessage: 'Risk score' }),
        tip: i18n.translate(`${I18N_PREFIX}.col.riskTip`, {
          defaultMessage:
            'Entity risk-engine score 0–100 and level, with change over the trend window.',
        }),
      };
    case 'alerts':
      return {
        label: i18n.translate(`${I18N_PREFIX}.col.alerts`, { defaultMessage: 'Alerts' }),
        tip: i18n.translate(`${I18N_PREFIX}.col.alertsTip`, {
          defaultMessage: 'Detection alerts naming this entity (last 30 days).',
        }),
      };
    case 'uncased':
      return {
        label: i18n.translate(`${I18N_PREFIX}.col.uncased`, { defaultMessage: 'Uncased alerts' }),
        tip: i18n.translate(`${I18N_PREFIX}.col.uncasedTip`, {
          defaultMessage:
            'Alerts known not to be attached to any case. Unavailable when exact alert associations cannot be established.',
        }),
      };
    case 'rules':
      return {
        label: i18n.translate(`${I18N_PREFIX}.col.rules`, { defaultMessage: 'Rules firing' }),
        tip: i18n.translate(`${I18N_PREFIX}.col.rulesTip`, {
          defaultMessage: "Distinct detection rules that generated this entity's alerts.",
        }),
      };
    case 'anoms':
      return {
        label: i18n.translate(`${I18N_PREFIX}.col.anoms`, { defaultMessage: 'Anomalies' }),
        tip: i18n.translate(`${I18N_PREFIX}.col.anomsTip`, {
          defaultMessage: 'ML anomaly detection records above threshold.',
        }),
      };
    case 'attacks':
      return {
        label: i18n.translate(`${I18N_PREFIX}.col.attacks`, { defaultMessage: 'Attacks' }),
        tip: i18n.translate(`${I18N_PREFIX}.col.attacksTip`, {
          defaultMessage:
            'Attack Discoveries (AI-correlated alert clusters) referencing this entity.',
        }),
      };
    case 'cases':
      return { label: i18n.translate(`${I18N_PREFIX}.col.cases`, { defaultMessage: 'Cases' }) };
    case 'watchlists':
      return {
        label: i18n.translate(`${I18N_PREFIX}.col.watchlists`, { defaultMessage: 'Watchlists' }),
      };
    case 'identity':
      return {
        label: i18n.translate(`${I18N_PREFIX}.col.identity`, {
          defaultMessage: 'Resolution group',
        }),
        tip: i18n.translate(`${I18N_PREFIX}.col.identityTip`, {
          defaultMessage: 'Identity sources and resolved identities for this entity.',
        }),
      };
    case 'firstSeen':
      return {
        label: i18n.translate(`${I18N_PREFIX}.col.firstSeen`, { defaultMessage: 'First seen' }),
      };
    case 'lastSeen':
      return {
        label: i18n.translate(`${I18N_PREFIX}.col.lastSeen`, { defaultMessage: 'Last seen' }),
      };
    case 'lastAlert':
      return {
        label: i18n.translate(`${I18N_PREFIX}.col.lastAlert`, { defaultMessage: 'Last alert' }),
      };
    default:
      return { label: id };
  }
};

const NUM_COLS = new Set<EntityColumnId>([
  'risk',
  'alerts',
  'uncased',
  'anoms',
  'attacks',
  'cases',
]);

export interface EntitiesTableProps {
  rows: EntityRow[];
  columns: ColumnDef[];
  sort: SortState;
  win: TrendWindow;
  now: number;
  activeRule: string | null;
  onSort: (col: EntityColumnId) => void;
  onRuleClick: (rule: string) => void;
  onRowClick: (row: EntityRow) => void;
}

/** Dense, sortable, configurable entity listing table. */
export const EntitiesTable: React.FC<EntitiesTableProps> = ({
  rows,
  columns,
  sort,
  win,
  now,
  activeRule,
  onSort,
  onRuleClick,
  onRowClick,
}) => {
  const { euiTheme } = useEuiTheme();
  const [expanded, setExpanded] = useState<Record<string, Set<EntityColumnId>>>({});

  const toggleExpanded = useCallback((rowId: string, col: EntityColumnId) => {
    setExpanded((prev) => {
      const forRow = new Set(prev[rowId] ?? []);
      if (forRow.has(col)) forRow.delete(col);
      else forRow.add(col);
      return { ...prev, [rowId]: forRow };
    });
  }, []);

  const tableStyle = css`
    border-collapse: collapse;
    width: 100%;
    min-width: ${Math.max(720, columns.length * 120)}px;
    font-size: 13px;
  `;

  const thStyle = (num: boolean, sortable: boolean, sorted: boolean) => css`
    text-align: ${num ? 'right' : 'left'};
    font-size: 10px;
    font-weight: ${euiTheme.font.weight.semiBold};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${sorted ? euiTheme.colors.textHeading : euiTheme.colors.textSubdued};
    padding: ${euiTheme.size.s} ${euiTheme.size.base};
    border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
    white-space: nowrap;
    user-select: none;
    background: ${euiTheme.colors.backgroundBaseSubdued};
    position: sticky;
    top: 0;
    z-index: 1;
    cursor: ${sortable ? 'pointer' : 'default'};
    transition: color ${euiTheme.animation.extraFast} ease;

    &:hover {
      ${sortable ? `color: ${euiTheme.colors.textHeading};` : ''}
    }
  `;

  const tdStyle = (num: boolean) => css`
    padding: ${euiTheme.size.s} ${euiTheme.size.base};
    border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
    vertical-align: middle;
    white-space: nowrap;
    text-align: ${num ? 'right' : 'left'};
    font-variant-numeric: ${num ? 'tabular-nums' : 'normal'};
    color: ${euiTheme.colors.textParagraph};
  `;

  const rowStyle = css`
    cursor: pointer;
    transition: background-color ${euiTheme.animation.extraFast} ease;

    /* Uniform rows — no zebra so no row ever reads as a different/disabled
     * state. A single very subtle neutral hover aids scanning. */
    &:hover > td {
      background: ${euiTheme.colors.backgroundBaseSubdued};
    }
  `;

  const zeroStyle = css`
    color: ${euiTheme.colors.textDisabled};
  `;

  // ONE consistent risk treatment on every row: bold tabular score + level
  // label. Color is signal-only — the level word turns severity-colored for
  // High/Critical and stays subdued otherwise. No filled blocks / gauges.
  const riskRowStyle = css`
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  `;

  const chipStyle = css`
    flex: none;
    display: inline-block;
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.medium};
    border-radius: ${euiTheme.border.radius.small};
    padding: 1px 7px;
    background: ${euiTheme.colors.backgroundBaseSubdued};
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
    color: ${euiTheme.colors.textSubdued};
    white-space: nowrap;
  `;

  const moreBtnStyle = css`
    flex: none;
    display: inline-flex;
    align-items: center;
    background: ${euiTheme.colors.backgroundBaseSubdued};
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
    border-radius: ${euiTheme.border.radius.small};
    padding: 0 6px;
    height: 18px;
    cursor: pointer;
    color: ${euiTheme.colors.textSubdued};
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.semiBold};
    white-space: nowrap;
    &:hover {
      color: ${euiTheme.colors.textPrimary};
      border-color: ${transparentize(euiTheme.colors.primary, 0.5)};
    }
  `;

  const ruleNameStyle = (hit: boolean) => css`
    font-size: 12px;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    text-align: left;
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${hit ? euiTheme.colors.textPrimary : euiTheme.colors.textParagraph};
    font-weight: ${hit ? euiTheme.font.weight.semiBold : euiTheme.font.weight.regular};
    &:hover {
      color: ${euiTheme.colors.textPrimary};
      text-decoration: underline;
    }
  `;

  const timeStyle = (recent: boolean) => css`
    color: ${recent ? euiTheme.colors.textParagraph : euiTheme.colors.textSubdued};
    font-weight: ${euiTheme.font.weight.regular};
    font-size: 12px;
  `;

  const renderMultiCell = (
    row: EntityRow,
    col: EntityColumnId,
    items: React.ReactNode[],
    unitLabel: (count: number) => string
  ) => {
    if (items.length === 0) return <span css={zeroStyle}>{'—'}</span>;
    const isOpen = expanded[row.base.id]?.has(col) ?? false;
    // Collapsed: keep the row single-height by showing the first item inline
    // with a subdued "+N" affordance. Expanded: wrap the full set.
    const shown = isOpen ? items : items.slice(0, 1);
    const overflow = items.length - shown.length;
    return (
      <span
        css={css`
          display: flex;
          flex-wrap: ${isOpen ? 'wrap' : 'nowrap'};
          align-items: center;
          gap: ${isOpen ? '4px' : '6px'};
          min-width: 0;
          max-width: 100%;
        `}
      >
        <span
          css={css`
            display: ${isOpen ? 'flex' : 'inline-flex'};
            flex-wrap: ${isOpen ? 'wrap' : 'nowrap'};
            align-items: center;
            gap: 4px;
            min-width: 0;
            overflow: hidden;
          `}
        >
          {shown}
        </span>
        {!isOpen && overflow > 0 ? (
          <button
            type="button"
            css={moreBtnStyle}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(row.base.id, col);
            }}
            title={unitLabel(items.length)}
          >
            {`+${overflow}`}
          </button>
        ) : null}
        {isOpen ? (
          <button
            type="button"
            css={moreBtnStyle}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(row.base.id, col);
            }}
          >
            {i18n.translate(`${I18N_PREFIX}.table.showLess`, { defaultMessage: 'Show less' })}
          </button>
        ) : null}
      </span>
    );
  };

  const unavailableCell = (status: 'unavailable' | 'ambiguous' | 'partial' = 'unavailable') => {
    const label =
      status === 'ambiguous'
        ? i18n.translate(`${I18N_PREFIX}.table.ambiguousEvidence`, {
            defaultMessage:
              'Multiple entities share this identifier; evidence cannot be assigned uniquely.',
          })
        : status === 'partial'
        ? i18n.translate(`${I18N_PREFIX}.table.partialEvidence`, {
            defaultMessage: 'Partial data; a complete count cannot be established.',
          })
        : i18n.translate(`${I18N_PREFIX}.table.unavailableEvidence`, {
            defaultMessage: 'Evidence unavailable',
          });
    return (
      <EuiToolTip content={label}>
        <span css={zeroStyle} aria-label={label} tabIndex={0}>
          {'—'}
        </span>
      </EuiToolTip>
    );
  };

  const renderCell = (row: EntityRow, col: EntityColumnId): React.ReactNode => {
    const delta = row.deltas[win];
    const evidenceKind = evidenceKindForColumn(col);
    const status = evidenceKind ? row.evidence?.[evidenceKind] : undefined;
    if (status && status !== 'available') return unavailableCell(status);
    switch (col) {
      case 'name':
        return (
          <span
            css={css`
              display: flex;
              align-items: center;
              gap: 8px;
              min-width: 0;
            `}
          >
            <EntityAvatar row={row} />
            <span
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
                color: ${euiTheme.colors.textHeading};
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 220px;
              `}
              title={row.base.name}
            >
              {row.base.name}
            </span>
          </span>
        );
      case 'criticality': {
        const label = criticalityLabel(row.criticality);
        return (
          <span
            css={css`
              color: ${row.criticality
                ? euiTheme.colors.textParagraph
                : euiTheme.colors.textSubdued};
              white-space: nowrap;
            `}
          >
            {label}
          </span>
        );
      }
      case 'risk': {
        if (row.base.riskScoreNorm === undefined) return unavailableCell();
        const high = row.level === 'High' || row.level === 'Critical';
        const score = Math.round(row.risk);
        return (
          <span
            css={css`
              display: inline-flex;
              flex-direction: column;
              align-items: flex-end;
              gap: 2px;
            `}
          >
            <span css={riskRowStyle}>
              <b
                css={css`
                  font-weight: ${euiTheme.font.weight.semiBold};
                  color: ${euiTheme.colors.textHeading};
                `}
              >
                {score}
              </b>
              <span
                css={css`
                  font-weight: ${high
                    ? euiTheme.font.weight.semiBold
                    : euiTheme.font.weight.regular};
                  color: ${high
                    ? getRiskLevelColor(euiTheme, row.level)
                    : euiTheme.colors.textSubdued};
                `}
              >
                {row.level}
              </span>
            </span>
            {hasEvidence(row, 'riskHistory') ? <DeltaText value={delta.risk} invert /> : null}
          </span>
        );
      }
      case 'alerts':
        return (
          <span
            css={css`
              display: inline-flex;
              flex-direction: column;
              align-items: flex-end;
              gap: 2px;
            `}
          >
            {row.alerts ? (
              <b
                css={css`
                  font-weight: ${euiTheme.font.weight.semiBold};
                `}
              >
                {row.alerts.toLocaleString()}
              </b>
            ) : (
              <span css={zeroStyle}>{'0'}</span>
            )}
            <DeltaText value={delta.alerts} invert />
          </span>
        );
      case 'uncased': {
        const uncased = uncasedOf(row);
        if (uncased === undefined) return unavailableCell();
        return uncased ? (
          <b
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            {uncased.toLocaleString()}
          </b>
        ) : (
          <span css={zeroStyle}>{'0'}</span>
        );
      }
      case 'rules': {
        const newSet = new Set(row.newRules);
        const sorted = [...row.ruleNames].sort(
          (a, b) => (newSet.has(b) ? 1 : 0) - (newSet.has(a) ? 1 : 0)
        );
        return renderMultiCell(
          row,
          'rules',
          sorted.map((rule) => (
            <span
              key={rule}
              css={css`
                display: inline-flex;
                align-items: center;
                gap: 4px;
              `}
            >
              <button
                type="button"
                css={ruleNameStyle(activeRule === rule)}
                onClick={(e) => {
                  e.stopPropagation();
                  onRuleClick(rule);
                }}
                title={rule}
              >
                {rule}
              </button>
              {newSet.has(rule) ? (
                <span
                  css={css`
                    flex: none;
                    font-size: 8.5px;
                    font-weight: ${euiTheme.font.weight.bold};
                    letter-spacing: 0.05em;
                    line-height: 1;
                    padding: 2px 4px;
                    border-radius: ${euiTheme.border.radius.small};
                    color: ${euiTheme.colors.textWarning};
                    background: ${euiTheme.colors.backgroundBaseWarning};
                  `}
                >
                  {i18n.translate(`${I18N_PREFIX}.table.newTag`, { defaultMessage: 'NEW' })}
                </span>
              ) : null}
            </span>
          )),
          (n) =>
            i18n.translate(`${I18N_PREFIX}.table.ruleCount`, {
              defaultMessage: '{n, plural, one {# rule} other {# rules}}',
              values: { n },
            })
        );
      }
      case 'anoms':
        return row.anoms ? (
          <b
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            {row.anoms.toLocaleString()}
          </b>
        ) : (
          <span css={zeroStyle}>{'0'}</span>
        );
      case 'attacks':
        return row.attacks ? (
          <b
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
              color: ${euiTheme.colors.textDanger};
              font-variant-numeric: tabular-nums;
            `}
          >
            {row.attacks}
          </b>
        ) : (
          <span css={zeroStyle}>{'0'}</span>
        );
      case 'cases':
        return row.cases ? (
          <b
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            {row.cases}
          </b>
        ) : (
          <span css={zeroStyle}>{'0'}</span>
        );
      case 'watchlists':
        return renderMultiCell(
          row,
          'watchlists',
          row.watchlists.map((w) => (
            <span key={w} css={chipStyle}>
              {w}
            </span>
          )),
          (n) =>
            i18n.translate(`${I18N_PREFIX}.table.watchlistCount`, {
              defaultMessage: '{n, plural, one {# watchlist} other {# watchlists}}',
              values: { n },
            })
        );
      case 'identity':
        return renderMultiCell(
          row,
          'identity',
          row.identities.map((id) => (
            <span
              key={`${id.source}:${id.value}`}
              css={css`
                display: inline-flex;
                align-items: center;
                gap: 5px;
              `}
            >
              <span
                css={css`
                  flex: none;
                  font-size: 9px;
                  font-weight: ${euiTheme.font.weight.bold};
                  letter-spacing: 0.03em;
                  border-radius: ${euiTheme.border.radius.small};
                  padding: 1px 5px;
                  background: ${euiTheme.colors.backgroundBaseSubdued};
                  border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
                  color: ${euiTheme.colors.textSubdued};
                  text-transform: uppercase;
                `}
              >
                {id.source}
              </span>
              <span
                css={css`
                  font-size: 12px;
                  color: ${euiTheme.colors.textParagraph};
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                  max-width: 220px;
                `}
                title={id.value}
              >
                {id.value}
              </span>
            </span>
          )),
          (n) =>
            i18n.translate(`${I18N_PREFIX}.table.identityCount`, {
              defaultMessage: '{n, plural, one {# identity} other {# identities}}',
              values: { n },
            })
        );
      case 'firstSeen':
        return <span css={timeStyle(false)}>{relativeTime(row.firstSeen, now)}</span>;
      case 'lastSeen':
        return (
          <span css={timeStyle(isRecent(row.lastSeen, now, 30 * MIN))}>
            {relativeTime(row.lastSeen, now)}
          </span>
        );
      case 'lastAlert':
        return (
          <span css={timeStyle(isRecent(row.lastAlert, now, HOUR))}>
            {relativeTime(row.lastAlert, now)}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      css={css`
        overflow: auto;
        max-height: calc(100vh - 320px);
      `}
    >
      <table
        css={tableStyle}
        aria-label={i18n.translate(`${I18N_PREFIX}.table.label`, {
          defaultMessage: 'Entity listing',
        })}
      >
        <thead>
          <tr>
            {columns.map((col) => {
              const header = columnHeader(col.id);
              const num = NUM_COLS.has(col.id);
              const sorted = sort.col === col.id;
              return (
                <th
                  key={col.id}
                  css={thStyle(num, !!col.sortable, sorted)}
                  onClick={col.sortable ? () => onSort(col.id) : undefined}
                  aria-sort={sorted ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}
                  data-test-subj={`entityIntelligenceEntitiesCol-${col.id}`}
                >
                  <span
                    css={css`
                      display: inline-flex;
                      align-items: center;
                      gap: 3px;
                      vertical-align: middle;
                      flex-direction: ${num ? 'row-reverse' : 'row'};
                    `}
                  >
                    {header.tip ? (
                      <EuiToolTip content={header.tip}>
                        <span tabIndex={0}>{header.label}</span>
                      </EuiToolTip>
                    ) : (
                      <span>{header.label}</span>
                    )}
                    {sorted ? (
                      <EuiIcon
                        type={sort.dir === 1 ? 'sortUp' : 'sortDown'}
                        size="s"
                        color="subdued"
                        aria-hidden={true}
                      />
                    ) : null}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div
                  css={css`
                    padding: ${euiTheme.size.xxl} ${euiTheme.size.l};
                    text-align: center;
                    color: ${euiTheme.colors.textSubdued};
                  `}
                >
                  {i18n.translate(`${I18N_PREFIX}.table.empty`, {
                    defaultMessage: 'No entities match the current filters.',
                  })}
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.base.id}
                css={rowStyle}
                onClick={() => onRowClick(row)}
                data-test-subj={`entityIntelligenceEntitiesRow-${row.base.name}`}
              >
                {columns.map((col) => (
                  <td key={col.id} css={tdStyle(NUM_COLS.has(col.id))}>
                    {renderCell(row, col.id)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

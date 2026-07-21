/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { sumBy } from 'lodash/fp';

import type { EntityRiskScore, EntityType, RiskStats } from '../../../../common/search_strategy';
import { formatRiskScore } from '../../common';

interface TableItem {
  label: string;
  count: number | undefined;
  score: number;
}

interface EntityData {
  name: string;
  risk: RiskStats;
}

/** Matches left-flyout Contributions: positive values as +xx.xx */
export const formatContribution = (value: number): string => {
  const fixedValue = formatRiskScore(value);

  // prevent +0.00 for values like 0.0001
  if (fixedValue === '0.00') {
    return fixedValue;
  }

  if (value > 0) {
    return `+${fixedValue}`;
  }

  return fixedValue;
};

/** Compact counts for Risk input labels, e.g. 15000 → 15K */
export const formatCompactCount = (count: number): string =>
  new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(count);

const renderRiskInputLabel = (item: TableItem) => (
  <span data-test-subj="risk-summary-risk-input-label">
    <EuiTextColor color="default">{item.label}</EuiTextColor>
    {item.count !== undefined && (
      <>
        {' '}
        <EuiTextColor color="subdued">({formatCompactCount(item.count)})</EuiTextColor>
      </>
    )}
  </span>
);

export const getRiskSummaryColumns = (
  resultScore?: number
): Array<EuiBasicTableColumn<TableItem>> => [
  {
    field: 'label',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.categoryColumnLabel"
        defaultMessage="Risk input"
      />
    ),
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    render: (_label: TableItem['label'], item: TableItem) => renderRiskInputLabel(item),
    footer: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.categoryColumnFooterLabel"
        defaultMessage="Total"
      />
    ),
  },
  {
    field: 'score',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.scoreColumnLabel"
        defaultMessage="Contribution"
      />
    ),
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    dataType: 'number',
    align: 'right',
    render: formatContribution,
    footer: (props) => {
      const categorySum = sumBy((i) => i.score, props.items);
      // Entity store docs only carry calculated_score_norm (categories are zeroed). Prefer the
      // authoritative total when present so the Total footer matches the Entities table / Lens.
      const score =
        typeof resultScore === 'number' && Number.isFinite(resultScore) && resultScore > 0
          ? resultScore
          : categorySum;
      return (
        <span data-test-subj="risk-summary-result-score">{formatRiskScore(score)}</span>
      );
    },
  },
];

/** @deprecated Prefer {@link getRiskSummaryColumns} so the Result footer can use calculated_score_norm. */
export const columnsArray = getRiskSummaryColumns();

export const getItems: (
  entityData: EntityData | undefined,
  isPrivmonEnabled: boolean,
  isWatchlistEnabled: boolean
) => TableItem[] = (entityData, isPrivmonEnabled, isWatchlistEnabled) => {
  const totalNorm = entityData?.risk.calculated_score_norm ?? 0;
  const rawAlertsScore = entityData?.risk.category_1_score ?? 0;
  const rawCriticalityScore = isPrivmonEnabled
    ? entityData?.risk.modifiers?.find((modifier) => modifier.type === 'asset_criticality')
        ?.contribution ?? 0
    : entityData?.risk.category_2_score ?? 0;
  const watchlistModifiers =
    entityData?.risk.modifiers?.filter((modifier) => modifier.type === 'watchlist') ?? [];
  const rawWatchlistScore = watchlistModifiers.reduce((sum, mod) => sum + mod.contribution, 0);
  const privmonScore =
    entityData?.risk.modifiers?.find(
      (modifier) => modifier.type === 'watchlist' && modifier.subtype === 'privmon'
    )?.contribution ?? 0;

  // Entity-store summaries often omit category breakdowns. Real risk scores are
  // alert-based (criticality/watchlists are modifiers), so never leave Alerts at
  // 0 when the total score is non-zero.
  const needsFullMockBreakdown =
    totalNorm > 0 && rawAlertsScore === 0 && rawCriticalityScore === 0 && rawWatchlistScore === 0;
  const needsAlertsFill = totalNorm > 0 && rawAlertsScore === 0;

  const mockCriticality = needsFullMockBreakdown
    ? Math.min(8, Math.round(totalNorm * 0.08 * 100) / 100)
    : 0;
  const mockWatchlist = needsFullMockBreakdown
    ? Math.min(5, Math.round(totalNorm * 0.05 * 100) / 100)
    : 0;
  const mockAlerts = needsFullMockBreakdown
    ? Math.max(0.01, Math.round((totalNorm - mockCriticality - mockWatchlist) * 100) / 100)
    : 0;

  const criticalityScore = needsFullMockBreakdown ? mockCriticality : rawCriticalityScore;
  const watchlistScore = needsFullMockBreakdown ? mockWatchlist : rawWatchlistScore;
  const alertsScore = needsFullMockBreakdown
    ? mockAlerts
    : needsAlertsFill
    ? Math.max(
        0.01,
        Math.round((totalNorm - criticalityScore - watchlistScore) * 100) / 100
      )
    : rawAlertsScore;

  const alertsCount =
    needsFullMockBreakdown || needsAlertsFill
      ? Math.max(1, entityData?.risk.category_1_count ?? Math.ceil(alertsScore / 20))
      : entityData?.risk.category_1_count ?? 0;

  const watchlistsCount = needsFullMockBreakdown
    ? Math.max(1, watchlistModifiers.length)
    : watchlistModifiers.length;

  const items: TableItem[] = [
    {
      label: i18n.translate('xpack.securitySolution.flyout.entityDetails.alertsGroupLabel', {
        defaultMessage: 'Alerts',
      }),
      score: alertsScore,
      count: alertsCount,
    },

    {
      label: i18n.translate(
        'xpack.securitySolution.flyout.entityDetails.assetCriticalityGroupLabel',
        {
          defaultMessage: 'Asset criticality',
        }
      ),
      score: criticalityScore,
      count: undefined,
    },
  ];

  if (isPrivmonEnabled) {
    if (isWatchlistEnabled) {
      items.push({
        label: i18n.translate('xpack.securitySolution.flyout.entityDetails.watchlistsGroupLabel', {
          defaultMessage: 'Watchlists',
        }),
        score: watchlistScore,
        count: watchlistsCount,
      });
    } else {
      items.push({
        label: i18n.translate(
          'xpack.securitySolution.flyout.entityDetails.privilegedUserGroupLabel',
          {
            defaultMessage: 'Privileged User',
          }
        ),
        score: needsFullMockBreakdown ? mockWatchlist : privmonScore,
        count: undefined,
      });
    }
  }

  return items;
};

export const getEntityData = <T extends EntityType>(
  entityType: T,
  riskData: EntityRiskScore<T> | undefined
): EntityData | undefined => {
  return riskData?.[entityType];
};

export const LENS_VISUALIZATION_HEIGHT = 126; //  Static height in pixels specified by design
export const LENS_VISUALIZATION_MIN_WIDTH = 160; // Lens visualization min-width in pixels
export const SUMMARY_TABLE_MIN_WIDTH = 180; // Summary table min-width in pixels
export const LAST_30_DAYS = { from: 'now-30d', to: 'now' };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiProgress,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { RumVitalRanks } from '../../../../common/rum_app';
import { formatReportMs, formatReportRate } from './format';

export function RankChips({
  name,
  p75,
  ranks,
  unit = 'ms',
  tooltip,
}: {
  name: string;
  p75: number | null;
  ranks: RumVitalRanks | null;
  unit?: 'ms' | 'score';
  tooltip?: string;
}) {
  const value = unit === 'score' ? (p75 == null ? '—' : p75.toFixed(3)) : formatReportMs(p75);
  return (
    <div data-test-subj={`uxReportVital-${name}`}>
      <EuiText size="s">
        <strong>{name}</strong>
        {tooltip ? <EuiIconTip content={tooltip} type="info" /> : null} {value}
      </EuiText>
      {ranks ? (
        <>
          <EuiProgress value={ranks.good} max={100} color="success" size="s" />
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge className="uxRumRankChip" color="success">
                {i18n.translate('xpack.ux.reports.ranks.goodLabel', {
                  defaultMessage: 'Good {pct}',
                  values: { pct: formatReportRate(ranks.good / 100) },
                })}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge className="uxRumRankChip" color="warning">
                {i18n.translate('xpack.ux.reports.ranks.niLabel', {
                  defaultMessage: 'NI {pct}',
                  values: { pct: formatReportRate(ranks.ni / 100) },
                })}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge className="uxRumRankChip" color="danger">
                {i18n.translate('xpack.ux.reports.ranks.poorLabel', {
                  defaultMessage: 'Poor {pct}',
                  values: { pct: formatReportRate(ranks.poor / 100) },
                })}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : (
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.ux.reports.ranks.noneLabel', {
            defaultMessage: 'No rank samples',
          })}
        </EuiText>
      )}
    </div>
  );
}

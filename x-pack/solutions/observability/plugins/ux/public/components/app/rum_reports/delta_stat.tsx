/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { RumReportDelta } from '../../../../common/rum_report';
import { formatReportRate } from './format';

export function DeltaStat({
  title,
  value,
  delta,
  invert = false,
  'data-test-subj': dataTestSubj,
}: {
  title: React.ReactNode;
  value: string;
  delta: RumReportDelta;
  invert?: boolean;
  'data-test-subj'?: string;
}) {
  const abs = delta.abs;
  const pct = delta.pct;
  const hasDelta = abs != null && pct != null;
  const isUp = (abs ?? 0) > 0;
  const isDown = (abs ?? 0) < 0;
  const positive = invert ? isDown : isUp;
  const negative = invert ? isUp : isDown;
  const color = positive ? 'success' : negative ? 'danger' : 'hollow';
  const deltaLabel = hasDelta
    ? `${isUp ? '+' : ''}${formatReportRate(pct).replace('%', '')}%`
    : i18n.translate('xpack.ux.reports.delta.noneLabel', { defaultMessage: 'No previous period' });

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj={dataTestSubj}
      className="uxRumReportKpiCard"
    >
      <EuiStat title={value} titleSize="m" description={title} />
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {hasDelta && abs !== 0 && (
            <EuiIcon
              type={isUp ? 'sortUp' : 'sortDown'}
              color={color}
              size="s"
              aria-hidden={true}
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge className="uxRumRankChip" color={hasDelta ? color : 'hollow'}>
            {deltaLabel}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { getSeverityColor } from '../../../../../../detections/components/alerts_kpis/severity_level_panel/helpers';
import { FormattedCount } from '../../../../../../common/components/formatted_number';
import { SEVERITY_COUNT_FIELDS, getNumber } from '../../common';
import type { Row } from '../../common';

const OPEN_ALERTS_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.alertCount.openAlertsAriaLabel',
  { defaultMessage: 'Open alerts' }
);

/** Severity counts filled by the alerts enrich query, in display order. */
const ALERT_SEVERITIES = [
  {
    key: 'critical',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.alertSeverity.critical', {
      defaultMessage: 'Critical',
    }),
  },
  {
    key: 'high',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.alertSeverity.high', {
      defaultMessage: 'High',
    }),
  },
  {
    key: 'medium',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.alertSeverity.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    key: 'low',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.home.alertSeverity.low', {
      defaultMessage: 'Low',
    }),
  },
] as const;

const noPointerEventsCss = css`
  pointer-events: none;
`;

interface AlertSeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/** The distribution bar is the most expensive cell content, so it renders only on new counts. */
const AlertSeverityBar = memo(
  ({ euiTheme, ...counts }: AlertSeverityCounts & { euiTheme: EuiThemeComputed }) => {
    const severities = ALERT_SEVERITIES.map(({ key, label }) => ({
      key,
      label,
      count: counts[key],
      color: getSeverityColor(key, euiTheme),
    })).filter((s) => s.count > 0);
    return <DistributionBar stats={severities} hideLastTooltip />;
  }
);
AlertSeverityBar.displayName = 'AlertSeverityBar';

export const AlertCountCell = memo(
  ({
    value,
    row,
    euiTheme,
    onAlertCountClick,
  }: {
    value: unknown;
    row: Row;
    euiTheme: EuiThemeComputed;
    onAlertCountClick?: (row: Row) => void;
  }) => {
    if (typeof value !== 'number' || value === 0) return <>{'—'}</>;
    const count = <FormattedCount count={value} />;
    const fullCount = value.toLocaleString();
    return (
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiFlexItem css={noPointerEventsCss}>
          <AlertSeverityBar
            euiTheme={euiTheme}
            critical={getNumber(row, SEVERITY_COUNT_FIELDS.critical) ?? 0}
            high={getNumber(row, SEVERITY_COUNT_FIELDS.high) ?? 0}
            medium={getNumber(row, SEVERITY_COUNT_FIELDS.medium) ?? 0}
            low={getNumber(row, SEVERITY_COUNT_FIELDS.low) ?? 0}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {onAlertCountClick ? (
            <EuiBadge
              color="hollow"
              title={fullCount}
              onClick={() => onAlertCountClick(row)}
              onClickAriaLabel={OPEN_ALERTS_ARIA_LABEL}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {count}
            </EuiBadge>
          ) : (
            <EuiBadge color="hollow" title={fullCount}>
              {count}
            </EuiBadge>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
AlertCountCell.displayName = 'AlertCountCell';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHealth, useEuiTheme, type EuiThemeComputed } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

type Severity = 'low' | 'medium' | 'high' | 'critical';

export const SIGNIFICANT_EVENT_SEVERITY: Record<
  Severity,
  { color: keyof EuiThemeComputed['colors']['severity']; label: string }
> = {
  low: {
    color: 'neutral',
    label: i18n.translate('xpack.nightshift.significantEventsTable.severityBadge.lowLabel', {
      defaultMessage: 'Low',
    }),
  },
  medium: {
    color: 'warning',
    label: i18n.translate('xpack.nightshift.significantEventsTable.severityBadge.mediumLabel', {
      defaultMessage: 'Medium',
    }),
  },
  high: {
    color: 'risk',
    label: i18n.translate('xpack.nightshift.significantEventsTable.severityBadge.highLabel', {
      defaultMessage: 'High',
    }),
  },
  critical: {
    color: 'danger',
    label: i18n.translate('xpack.nightshift.significantEventsTable.severityBadge.criticalLabel', {
      defaultMessage: 'Critical',
    }),
  },
};

export const scoreSeverity = (score: number): Severity => {
  if (score < 40) {
    return 'low';
  } else if (score < 60) {
    return 'medium';
  } else if (score < 80) {
    return 'high';
  }
  return 'critical';
};

export function SeverityBadge({
  score,
  severity,
  textSize = 'xs',
}: {
  score?: number;
  severity?: Severity;
  textSize?: 'xs' | 's';
}) {
  const { euiTheme } = useEuiTheme();
  const normalizedSeverity = severity ?? (score !== undefined ? scoreSeverity(score) : undefined);
  if (!normalizedSeverity) {
    return (
      <EuiHealth color="text" style={{ lineHeight: 'inherit' }} textSize={textSize}>
        {i18n.translate('xpack.nightshift.significantEventsTable.severityBadge.noSeverity', {
          defaultMessage: 'None',
        })}
      </EuiHealth>
    );
  }
  const { color, label } = SIGNIFICANT_EVENT_SEVERITY[normalizedSeverity];
  return (
    <EuiHealth
      color={euiTheme.colors.severity[color]}
      style={{ lineHeight: 'inherit' }}
      textSize={textSize}
    >
      {label}
    </EuiHealth>
  );
}

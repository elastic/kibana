/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { useMemo } from 'react';
import { ML_ANOMALY_THRESHOLD, getThemeResolvedSeverityColor } from '@kbn/ml-anomaly-utils';
import { i18n } from '@kbn/i18n';

/**
 * Local prototype copy of `useSeverityOptions` from the ML Anomaly Explorer
 * (x-pack/platform/plugins/shared/ml/public/application/explorer/hooks/use_severity_options.ts).
 *
 * Keeps the same shape so we can use the matching legend control without
 * importing private internals from the ML plugin.
 */

export interface SeverityOption {
  val: number;
  display: string;
  rangeDisplay: string;
  color: string;
}

const lowLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.severity.lowLabel',
  { defaultMessage: 'low' }
);
const warningLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.severity.warningLabel',
  { defaultMessage: 'warning' }
);
const minorLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.severity.minorLabel',
  { defaultMessage: 'minor' }
);
const majorLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.severity.majorLabel',
  { defaultMessage: 'major' }
);
const criticalLabel = i18n.translate(
  'xpack.securitySolution.entityAnalytics.behavioralAnomalies.severity.criticalLabel',
  { defaultMessage: 'critical' }
);

export const getSeverityRangeDisplay = (val: number): string => {
  switch (val) {
    case ML_ANOMALY_THRESHOLD.CRITICAL:
      return '75-100';
    case ML_ANOMALY_THRESHOLD.MAJOR:
      return '50-75';
    case ML_ANOMALY_THRESHOLD.MINOR:
      return '25-50';
    case ML_ANOMALY_THRESHOLD.WARNING:
      return '3-25';
    case ML_ANOMALY_THRESHOLD.LOW:
      return '0-3';
    default:
      return val.toString();
  }
};

export const useSeverityOptions = (): SeverityOption[] => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => [
      {
        val: ML_ANOMALY_THRESHOLD.LOW,
        display: lowLabel,
        rangeDisplay: getSeverityRangeDisplay(ML_ANOMALY_THRESHOLD.LOW),
        color: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.LOW, euiTheme),
      },
      {
        val: ML_ANOMALY_THRESHOLD.WARNING,
        display: warningLabel,
        rangeDisplay: getSeverityRangeDisplay(ML_ANOMALY_THRESHOLD.WARNING),
        color: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.WARNING, euiTheme),
      },
      {
        val: ML_ANOMALY_THRESHOLD.MINOR,
        display: minorLabel,
        rangeDisplay: getSeverityRangeDisplay(ML_ANOMALY_THRESHOLD.MINOR),
        color: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.MINOR, euiTheme),
      },
      {
        val: ML_ANOMALY_THRESHOLD.MAJOR,
        display: majorLabel,
        rangeDisplay: getSeverityRangeDisplay(ML_ANOMALY_THRESHOLD.MAJOR),
        color: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.MAJOR, euiTheme),
      },
      {
        val: ML_ANOMALY_THRESHOLD.CRITICAL,
        display: criticalLabel,
        rangeDisplay: getSeverityRangeDisplay(ML_ANOMALY_THRESHOLD.CRITICAL),
        color: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.CRITICAL, euiTheme),
      },
    ],
    [euiTheme]
  );
};

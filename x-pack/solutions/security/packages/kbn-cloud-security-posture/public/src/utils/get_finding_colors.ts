/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui';
import type { MisconfigurationEvaluationStatus } from '@kbn/cloud-security-posture-common';
import {
  VULNERABILITIES_SEVERITY,
  MISCONFIGURATION_STATUS,
} from '@kbn/cloud-security-posture-common';

export const getSeverityStatusColor = (severity: string, euiTheme: EuiThemeComputed): string => {
  switch (severity) {
    case VULNERABILITIES_SEVERITY.LOW:
      return euiTheme.colors.severity.neutral;
    case VULNERABILITIES_SEVERITY.MEDIUM:
      return euiTheme.colors.severity.warning;
    case VULNERABILITIES_SEVERITY.HIGH:
      return euiTheme.colors.severity.risk;
    case VULNERABILITIES_SEVERITY.CRITICAL:
      return euiTheme.colors.severity.danger;
    default:
      return euiTheme.colors.severity.unknown;
  }
};

export const getCvsScoreColor = (score: number, euiTheme: EuiThemeComputed): string | undefined => {
  if (score >= 0 && score <= 4) {
    return getSeverityStatusColor(VULNERABILITIES_SEVERITY.LOW, euiTheme);
  } else if (score >= 4 && score <= 7) {
    return getSeverityStatusColor(VULNERABILITIES_SEVERITY.MEDIUM, euiTheme);
  } else if (score >= 7 && score <= 9) {
    return getSeverityStatusColor(VULNERABILITIES_SEVERITY.HIGH, euiTheme);
  } else if (score >= 9) {
    return getSeverityStatusColor(VULNERABILITIES_SEVERITY.CRITICAL, euiTheme);
  } else {
    return getSeverityStatusColor(VULNERABILITIES_SEVERITY.UNKNOWN, euiTheme);
  }
};

export const getMisconfigurationStatusColor = (
  status: MisconfigurationEvaluationStatus,
  euiTheme: EuiThemeComputed
): string => {
  switch (status) {
    case MISCONFIGURATION_STATUS.PASSED:
      return euiTheme.colors.severity.success;
    case MISCONFIGURATION_STATUS.FAILED:
      return euiTheme.colors.severity.danger;
    default:
      return euiTheme.colors.severity.unknown;
  }
};

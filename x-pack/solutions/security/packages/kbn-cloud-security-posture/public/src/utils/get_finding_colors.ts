/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme'; // TODO: replace with euiTheme
import type { MisconfigurationEvaluationStatus } from '@kbn/cloud-security-posture-common';
import {
  VULNERABILITIES_SEVERITY,
  MISCONFIGURATION_STATUS,
} from '@kbn/cloud-security-posture-common';

const isAmsterdam = (euiThemeName: string) => {
  return euiThemeName?.toLowerCase().includes('amsterdam');
};

// Designers blocked the migration to tokens from EUI during the Borealys theme migration.
// We keep using hardcoded colors until security severity palette is ready https://github.com/elastic/kibana/issues/203387
// TODO: Borealis migration - move from hardcoded values to severity palette https://github.com/elastic/security-team/issues/11606
export const SEVERITY_COLOR = {
  critical: '#E7664C',
  high: '#DA8B45',
  medium: '#D6BF57',
  low: '#54B399',
  unknown: '#aaa',
} as const;

// TODO: Borealis migration - migrate to security severity palette when it's ready https://github.com/elastic/security-team/issues/11606
export const getSeverityStatusColor = (severity: string, euiTheme: EuiThemeComputed): string => {
  // TODO: Borealis migration - remove old mapping in main after Serverless switched to Borealis
  if (euiTheme && isAmsterdam(euiTheme.themeName)) {
    switch (severity) {
      case VULNERABILITIES_SEVERITY.LOW:
        return euiThemeVars.euiColorVis0;
      case VULNERABILITIES_SEVERITY.MEDIUM:
        return euiThemeVars.euiColorVis5_behindText;
      case VULNERABILITIES_SEVERITY.HIGH:
        return euiThemeVars.euiColorVis9_behindText;
      case VULNERABILITIES_SEVERITY.CRITICAL:
        return euiThemeVars.euiColorDanger;
      default:
        return '#aaa';
    }
  }

  switch (severity) {
    case VULNERABILITIES_SEVERITY.LOW:
      return SEVERITY_COLOR.low;
    case VULNERABILITIES_SEVERITY.MEDIUM:
      return SEVERITY_COLOR.medium;
    case VULNERABILITIES_SEVERITY.HIGH:
      return SEVERITY_COLOR.high;
    case VULNERABILITIES_SEVERITY.CRITICAL:
      return SEVERITY_COLOR.critical;
    default:
      return SEVERITY_COLOR.unknown;
  }
};

export const getCvsScoreColor = (score: number, euiTheme: EuiThemeComputed): string | undefined => {
  // TODO: Borealis migration - remove old mapping in main when Serverless switched to Borealis
  if (euiTheme && isAmsterdam(euiTheme.themeName)) {
    if (score <= 4) {
      return euiThemeVars.euiColorVis0; // low severity
    } else if (score >= 4 && score <= 7) {
      return euiThemeVars.euiColorVis7; // medium severity
    } else if (score >= 7 && score <= 9) {
      return euiThemeVars.euiColorVis9; // high severity
    } else if (score >= 9) {
      return euiThemeVars.euiColorDanger; // critical severity
    }
  }

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

// TODO: Borealis migration - migrate to EUI color tokens when they are ready https://github.com/elastic/security-team/issues/11606
export const getMisconfigurationStatusColor = (
  status?: MisconfigurationEvaluationStatus
): string => {
  switch (status) {
    case MISCONFIGURATION_STATUS.PASSED:
      return SEVERITY_COLOR.low;
    case MISCONFIGURATION_STATUS.FAILED:
      return SEVERITY_COLOR.critical;
    default:
      return SEVERITY_COLOR.unknown;
  }
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme'; // TODO: replace with euiTheme
import type {
  VulnSeverity,
  MisconfigurationEvaluationStatus,
} from '@kbn/cloud-security-posture-common';
import {
  VULNERABILITIES_SEVERITY,
  MISCONFIGURATION_STATUS,
} from '@kbn/cloud-security-posture-common';

const isBorealis = (euiThemeName: string) => {
  return euiThemeName?.toLowerCase().includes('borealis');
};

const isAmsterdam = (euiThemeName: string) => {
  return euiThemeName?.toLowerCase().includes('amsterdam');
};

export const getSeverityStatusColor = (
  severity: VulnSeverity,
  euiTheme: EuiThemeComputed
): string => {
  // TODO: remove old mapping in main when severity palette is fixed https://github.com/elastic/eui/pull/8254 and Serverless switched to Borealis
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
      return euiTheme.colors.vis.euiColorVis0; // TODO: use color from the severity palette? It's not green, decision from design is needed
    case VULNERABILITIES_SEVERITY.MEDIUM:
      return euiTheme.colors.vis.euiColorSeverity7;
    case VULNERABILITIES_SEVERITY.HIGH:
      return euiTheme.colors.vis.euiColorSeverity11;
    case VULNERABILITIES_SEVERITY.CRITICAL:
      return euiTheme.colors.vis.euiColorSeverity14;
    default:
      return euiTheme.colors.vis.euiColorSeverity0;
  }
};

export const getCvsScoreColor = (score: number, euiTheme: EuiThemeComputed): string | undefined => {
  // TODO: remove old mapping in main when severity palette is fixed https://github.com/elastic/eui/pull/8254 and Serverless switched to Borealis
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

export const getMisconfigurationStatusColor = (
  status: MisconfigurationEvaluationStatus,
  euiTheme: EuiThemeComputed
): string => {
  switch (status) {
    case MISCONFIGURATION_STATUS.PASSED:
      return euiTheme.colors.success;
    case MISCONFIGURATION_STATUS.FAILED:
      return euiTheme.colors.danger;
    default:
      return euiTheme.colors.vis.euiColorSeverity0;
  }
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskSeverity } from '../../../../common/search_strategy';

/**
 * Helper function to get risk score colors based on risk level
 * Returns color name for EuiHealth and badge color
 */
export const getRiskScoreColors = (level?: RiskSeverity): { color: string; badgeColor: string } => {
  if (!level) {
    return {
      color: 'subdued',
      badgeColor: 'default',
    };
  }

  switch (level) {
    case 'Unknown':
      return {
        color: 'subdued',
        badgeColor: 'default',
      };
    case 'Low':
      return {
        color: 'success',
        badgeColor: 'success',
      };
    case 'Moderate':
      return {
        color: 'warning',
        badgeColor: 'warning',
      };
    case 'High':
      return {
        color: 'danger',
        badgeColor: 'danger',
      };
    case 'Critical':
      return {
        color: 'danger',
        badgeColor: 'danger',
      };
    default:
      return {
        color: 'subdued',
        badgeColor: 'default',
      };
  }
};

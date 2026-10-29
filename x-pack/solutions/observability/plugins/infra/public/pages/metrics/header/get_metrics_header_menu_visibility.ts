/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isMetricsHostDetailPath,
  isMetricsHostsPath,
  isMetricsInventoryPath,
  isMetricsSettingsPath,
} from './metrics_header_paths';

export interface MetricsHeaderMenuVisibility {
  showAnomalyDetection: boolean;
  showHostsOnboarding: boolean;
  showSettings: boolean;
}

/**
 * Path-gated Metrics header actions.
 * Chrome portal reads anomaly detection and hosts onboarding.
 * AppHeader also reads showSettings; Chrome always shows its Settings link.
 */
export function getMetricsHeaderMenuVisibility(pathname: string): MetricsHeaderMenuVisibility {
  return {
    showAnomalyDetection:
      isMetricsInventoryPath(pathname) ||
      isMetricsHostsPath(pathname) ||
      isMetricsHostDetailPath(pathname),
    showHostsOnboarding: isMetricsHostsPath(pathname) || isMetricsHostDetailPath(pathname),
    showSettings: !isMetricsSettingsPath(pathname),
  };
}

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
} from './metrics_header_paths';

export interface MetricsHeaderMenuVisibility {
  showAnomalyDetection: boolean;
  showHostsOnboarding: boolean;
}

/**
 * Path-gated Metrics header actions shared by the Chrome portal and later AppHeader menus.
 */
export function getMetricsHeaderMenuVisibility(pathname: string): MetricsHeaderMenuVisibility {
  return {
    showAnomalyDetection:
      isMetricsInventoryPath(pathname) ||
      isMetricsHostsPath(pathname) ||
      isMetricsHostDetailPath(pathname),
    showHostsOnboarding: isMetricsHostsPath(pathname) || isMetricsHostDetailPath(pathname),
  };
}

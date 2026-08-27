/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMetricsHeaderMenuVisibility } from './get_metrics_header_menu_visibility';

describe('getMetricsHeaderMenuVisibility', () => {
  it('shows anomaly detection with job type controls on Inventory', () => {
    expect(getMetricsHeaderMenuVisibility('/inventory')).toEqual({
      showAnomalyDetection: true,
      hideAnomalyJobTypeAndGroup: false,
      showHostsOnboarding: false,
    });
  });

  it('shows anomaly detection without job type controls on Hosts', () => {
    expect(getMetricsHeaderMenuVisibility('/hosts')).toEqual({
      showAnomalyDetection: true,
      hideAnomalyJobTypeAndGroup: true,
      showHostsOnboarding: true,
    });
  });

  it('treats host detail like Hosts for onboarding and anomaly detection', () => {
    expect(getMetricsHeaderMenuVisibility('/detail/host/web-01')).toEqual({
      showAnomalyDetection: true,
      hideAnomalyJobTypeAndGroup: true,
      showHostsOnboarding: true,
    });
  });

  it('hides anomaly detection and hosts onboarding on Explorer and Settings', () => {
    expect(getMetricsHeaderMenuVisibility('/explorer')).toEqual({
      showAnomalyDetection: false,
      hideAnomalyJobTypeAndGroup: false,
      showHostsOnboarding: false,
    });
    expect(getMetricsHeaderMenuVisibility('/settings')).toEqual({
      showAnomalyDetection: false,
      hideAnomalyJobTypeAndGroup: false,
      showHostsOnboarding: false,
    });
  });

  it('does not treat container detail as a hosts onboarding path', () => {
    expect(getMetricsHeaderMenuVisibility('/detail/container/abc')).toEqual({
      showAnomalyDetection: false,
      hideAnomalyJobTypeAndGroup: false,
      showHostsOnboarding: false,
    });
  });
});

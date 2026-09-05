/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMetricsHeaderMenuVisibility } from './get_metrics_header_menu_visibility';

describe('getMetricsHeaderMenuVisibility', () => {
  it('shows anomaly detection on Inventory without hosts onboarding', () => {
    expect(getMetricsHeaderMenuVisibility('/inventory')).toEqual({
      showAnomalyDetection: true,
      showHostsOnboarding: false,
      showSettings: true,
    });
  });

  it('shows anomaly detection and hosts onboarding on Hosts', () => {
    expect(getMetricsHeaderMenuVisibility('/hosts')).toEqual({
      showAnomalyDetection: true,
      showHostsOnboarding: true,
      showSettings: true,
    });
  });

  it('treats host detail like Hosts for onboarding and anomaly detection', () => {
    expect(getMetricsHeaderMenuVisibility('/detail/host/web-01')).toEqual({
      showAnomalyDetection: true,
      showHostsOnboarding: true,
      showSettings: true,
    });
  });

  it('hides anomaly detection and hosts onboarding on Explorer and Settings', () => {
    expect(getMetricsHeaderMenuVisibility('/explorer')).toEqual({
      showAnomalyDetection: false,
      showHostsOnboarding: false,
      showSettings: true,
    });
    expect(getMetricsHeaderMenuVisibility('/settings')).toEqual({
      showAnomalyDetection: false,
      showHostsOnboarding: false,
      showSettings: false,
    });
  });

  it('does not treat container detail as a hosts onboarding path', () => {
    expect(getMetricsHeaderMenuVisibility('/detail/container/abc')).toEqual({
      showAnomalyDetection: false,
      showHostsOnboarding: false,
      showSettings: true,
    });
  });
});

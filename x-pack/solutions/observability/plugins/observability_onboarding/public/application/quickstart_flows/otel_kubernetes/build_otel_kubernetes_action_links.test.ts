/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildOtelKubernetesActionLinks } from './build_otel_kubernetes_action_links';

const baseParams = {
  dashboardHref: 'https://example/dashboard',
  servicesHref: 'https://example/services',
  logsHref: 'https://example/logs',
};

describe('buildOtelKubernetesActionLinks', () => {
  it('declares the logs link with requires: "logs" so the has-data gate waits for logs', () => {
    const links = buildOtelKubernetesActionLinks({
      isMetricsOnboardingEnabled: true,
      ...baseParams,
    });

    const logsLink = links.find((link) => link.id === 'logs');

    expect(logsLink).toBeDefined();
    expect(logsLink?.requires).toBe('logs');
  });

  it('declares dashboard and services links with requires: "metrics"', () => {
    const links = buildOtelKubernetesActionLinks({
      isMetricsOnboardingEnabled: true,
      ...baseParams,
    });

    const metricsLinks = links.filter((link) => link.id !== 'logs');

    expect(metricsLinks).toHaveLength(2);
    metricsLinks.forEach((link) => {
      expect(link.requires).toBe('metrics');
    });
  });

  it('omits metrics-gated links when metrics onboarding is disabled but keeps the logs link', () => {
    const links = buildOtelKubernetesActionLinks({
      isMetricsOnboardingEnabled: false,
      ...baseParams,
    });

    expect(links).toHaveLength(1);
    expect(links[0].id).toBe('logs');
    expect(links[0].requires).toBe('logs');
  });
});

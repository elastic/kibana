/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { buildValuesFileUrl } from './build_values_file_url';

describe('buildValuesFileUrl()', () => {
  it('builds logs+metrics URL when metrics onboarding is enabled', () => {
    const url = buildValuesFileUrl({
      isMetricsOnboardingEnabled: true,
      isManagedOtlpServiceAvailable: false,
      agentVersion: '9.1.0',
    });

    expect(url).toBe(
      'https://raw.githubusercontent.com/elastic/elastic-agent/refs/tags/v9.1.0/deploy/helm/edot-collector/kube-stack/values.yaml'
    );
  });

  it('builds logs-only URL when metrics onboarding is disabled', () => {
    const url = buildValuesFileUrl({
      isMetricsOnboardingEnabled: false,
      isManagedOtlpServiceAvailable: false,
      agentVersion: '9.1.0',
    });

    expect(url).toBe(
      'https://raw.githubusercontent.com/elastic/elastic-agent/refs/tags/v9.1.0/deploy/helm/edot-collector/kube-stack/logs-values.yaml'
    );
  });

  it('builds OTLP URL when OTLP service is available', () => {
    const url = buildValuesFileUrl({
      isMetricsOnboardingEnabled: false,
      isManagedOtlpServiceAvailable: true,
      agentVersion: '9.1.0',
    });

    expect(url).toBe(
      'https://raw.githubusercontent.com/elastic/elastic-agent/refs/tags/v9.1.0/deploy/helm/edot-collector/kube-stack/managed_otlp/logs-values.yaml'
    );
  });

  it('builds OTLP URL for logs+metrics when OTLP service is available and metrics onboarding is enabled', () => {
    const url = buildValuesFileUrl({
      isMetricsOnboardingEnabled: true,
      isManagedOtlpServiceAvailable: true,
      agentVersion: '9.1.0',
    });

    expect(url).toBe(
      'https://raw.githubusercontent.com/elastic/elastic-agent/refs/tags/v9.1.0/deploy/helm/edot-collector/kube-stack/managed_otlp/values.yaml'
    );
  });
});

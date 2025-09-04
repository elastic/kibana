/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { buildValuesFileUrl } from './build_values_file_url';

describe('buildValuesFileUrl()', () => {
  it('build non-OTLP, logs+metrics URL for self-hosted deployments', () => {
    const url = buildValuesFileUrl({
      isServerless: false,
      isCloud: false,
      metricsOnboardingEnabled: true,
      agentVersion: '9.1.0',
    });

    expect(url).toBe(
      'https://raw.githubusercontent.com/elastic/elastic-agent/refs/tags/v9.1.0/deploy/helm/edot-collector/kube-stack/values.yaml'
    );
  });

  it('build OTLP, logs+metrics URL for serverless deployments', () => {
    const url = buildValuesFileUrl({
      isServerless: true,
      isCloud: true,
      metricsOnboardingEnabled: true,
      agentVersion: '9.1.0',
    });

    expect(url).toBe(
      'https://raw.githubusercontent.com/elastic/elastic-agent/refs/tags/v9.1.0/deploy/helm/edot-collector/kube-stack/managed_otlp/values.yaml'
    );
  });

  it('build OTLP, logs+metrics URL for stateful cloud deployments', () => {
    const url = buildValuesFileUrl({
      isServerless: false,
      isCloud: true,
      metricsOnboardingEnabled: true,
      agentVersion: '9.1.0',
    });

    expect(url).toBe(
      'https://raw.githubusercontent.com/elastic/elastic-agent/refs/tags/v9.1.0/deploy/helm/edot-collector/kube-stack/managed_otlp/values.yaml'
    );
  });

  it('build OTLP, logs-only URL for serverless logs-essentials deployments', () => {
    const url = buildValuesFileUrl({
      isServerless: true,
      isCloud: true,
      metricsOnboardingEnabled: false,
      agentVersion: '9.1.0',
    });

    expect(url).toBe(
      'https://raw.githubusercontent.com/elastic/elastic-agent/refs/tags/v9.1.0/deploy/helm/edot-collector/kube-stack/managed_otlp/logs-values.yaml'
    );
  });
});

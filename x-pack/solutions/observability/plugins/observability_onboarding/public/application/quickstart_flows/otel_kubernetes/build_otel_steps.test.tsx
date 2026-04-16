/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildOtelSteps, type BuildOtelStepsParams } from './build_otel_steps';

const baseData = {
  onboardingId: 'test-id',
  apiKeyEncoded: 'dGVzdC1hcGkta2V5',
  elasticsearchUrl: 'https://es.example.com:9200',
  elasticAgentVersionInfo: {
    agentBaseVersion: '9.1.0',
    agentVersion: '9.1.0',
    agentDockerImageVersion: '9.1.0',
  },
  managedOtlpServiceUrl: '',
};

const mockTheme = {
  euiTheme: {
    font: {
      weight: {
        bold: 700,
      },
    },
  },
} as unknown as BuildOtelStepsParams['theme'];

const createParams = (overrides?: Partial<BuildOtelStepsParams>): BuildOtelStepsParams => ({
  data: baseData,
  isMonitoringStepActive: false,
  dataReceived: false,
  hasPreExistingDataEarly: false,
  isMetricsOnboardingEnabled: true,
  isManagedOtlpServiceAvailable: false,
  addRepoCommand: 'helm repo add open-telemetry ...',
  installStackCommand: 'helm install ...',
  otelKubeStackValuesFileUrl: 'https://example.com/values.yaml',
  ingestionMode: 'classic',
  onIngestionModeChange: jest.fn(),
  isWiredStreamsLoading: false,
  isWiredStreamsEnabled: false,
  isEnabling: false,
  enableWiredStreams: jest.fn(),
  streamsDocLink: 'https://docs.example.com',
  useWiredStreams: false,
  idSelected: 'nodejs',
  onLanguageChange: jest.fn(),
  actionLinks: [],
  onDataReceived: jest.fn(),
  theme: mockTheme,
  ...overrides,
});

describe('buildOtelSteps', () => {
  it('returns 4 steps when metrics onboarding is enabled', () => {
    const steps = buildOtelSteps(createParams({ isMetricsOnboardingEnabled: true }));
    expect(steps).toHaveLength(4);
  });

  it('returns 3 steps when metrics onboarding is disabled', () => {
    const steps = buildOtelSteps(createParams({ isMetricsOnboardingEnabled: false }));
    expect(steps).toHaveLength(3);
  });

  it('has correct step titles when metrics is enabled', () => {
    const steps = buildOtelSteps(createParams({ isMetricsOnboardingEnabled: true }));
    expect(steps[0].title).toBe('Add the OpenTelemetry repository to Helm');
    expect(steps[1].title).toBe('Install the OpenTelemetry Operator');
    expect(steps[2].title).toBe('Instrument your application (optional)');
    expect(steps[3].title).toBe('Visualize your data');
  });

  it('has correct step titles when metrics is disabled', () => {
    const steps = buildOtelSteps(createParams({ isMetricsOnboardingEnabled: false }));
    expect(steps[0].title).toBe('Add the OpenTelemetry repository to Helm');
    expect(steps[1].title).toBe('Install the OpenTelemetry Operator');
    expect(steps[2].title).toBe('Visualize your data');
  });

  it('sets visualize step status to incomplete when not active', () => {
    const steps = buildOtelSteps(createParams({ isMonitoringStepActive: false }));
    const lastStep = steps[steps.length - 1];
    expect(lastStep.status).toBe('incomplete');
  });

  it('sets visualize step status to current when monitoring is active', () => {
    const steps = buildOtelSteps(createParams({ isMonitoringStepActive: true }));
    const lastStep = steps[steps.length - 1];
    expect(lastStep.status).toBe('current');
  });

  it('sets visualize step status to complete when data is received', () => {
    const steps = buildOtelSteps(createParams({ dataReceived: true }));
    const lastStep = steps[steps.length - 1];
    expect(lastStep.status).toBe('complete');
  });

  it('sets visualize step status to complete when pre-existing data is detected', () => {
    const steps = buildOtelSteps(createParams({ hasPreExistingDataEarly: true }));
    const lastStep = steps[steps.length - 1];
    expect(lastStep.status).toBe('complete');
  });
});

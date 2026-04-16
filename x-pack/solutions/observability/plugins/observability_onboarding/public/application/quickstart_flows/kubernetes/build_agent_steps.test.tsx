/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { buildAgentSteps, type BuildAgentStepsParams } from './build_agent_steps';

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

const createParams = (overrides?: Partial<BuildAgentStepsParams>): BuildAgentStepsParams => ({
  data: baseData,
  status: FETCH_STATUS.SUCCESS,
  isMonitoringStepActive: false,
  dataReceived: false,
  hasPreExistingDataEarly: false,
  ingestionMode: 'classic',
  onIngestionModeChange: jest.fn(),
  actionLinks: [],
  onDataReceived: jest.fn(),
  ...overrides,
});

describe('buildAgentSteps', () => {
  it('returns exactly 2 steps', () => {
    const steps = buildAgentSteps(createParams());
    expect(steps).toHaveLength(2);
  });

  it('has install and monitor step titles', () => {
    const steps = buildAgentSteps(createParams());
    expect(steps[0].title).toBe('Install standalone Elastic Agent on your Kubernetes cluster');
    expect(steps[1].title).toBe('Monitor your Kubernetes cluster');
  });

  it('sets monitor step status to incomplete when not active', () => {
    const steps = buildAgentSteps(createParams({ isMonitoringStepActive: false }));
    expect(steps[1].status).toBe('incomplete');
  });

  it('sets monitor step status to current when monitoring is active', () => {
    const steps = buildAgentSteps(createParams({ isMonitoringStepActive: true }));
    expect(steps[1].status).toBe('current');
  });

  it('sets monitor step status to complete when data is received', () => {
    const steps = buildAgentSteps(createParams({ dataReceived: true }));
    expect(steps[1].status).toBe('complete');
  });

  it('sets monitor step status to complete when pre-existing data is detected', () => {
    const steps = buildAgentSteps(createParams({ hasPreExistingDataEarly: true }));
    expect(steps[1].status).toBe('complete');
  });
});

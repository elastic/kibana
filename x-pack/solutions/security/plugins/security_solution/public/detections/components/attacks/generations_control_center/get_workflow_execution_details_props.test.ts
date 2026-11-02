/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryGeneration } from '@kbn/elastic-assistant-common';

import { getMockConnectors } from '../../../../attack_discovery/pages/mock/mock_connectors';
import { getWorkflowExecutionDetailsProps } from './get_workflow_execution_details_props';

const generation: AttackDiscoveryGeneration = {
  alerts_context_count: 75,
  connector_id: 'gpt41Azure',
  connector_stats: {
    average_successful_duration_nanoseconds: 2_000_000_000,
    successful_generations: 3,
  },
  discoveries: 8,
  execution_uuid: 'uuid-1',
  start: '2025-05-19T22:15:10.759Z',
  status: 'succeeded',
  workflow_id: 'workflow-123',
  workflow_run_id: 'run-456',
};

const defaultArgs = {
  aiConnectors: getMockConnectors(),
  generation,
  localStorageAttackDiscoveryMaxAlerts: '100',
};

describe('getWorkflowExecutionDetailsProps', () => {
  it('maps the execution_uuid', () => {
    expect(getWorkflowExecutionDetailsProps(defaultArgs).executionUuid).toBe('uuid-1');
  });

  it('maps the generation status to generationStatus', () => {
    expect(getWorkflowExecutionDetailsProps(defaultArgs).generationStatus).toBe('succeeded');
  });

  it('maps discoveries to discoveriesCount', () => {
    expect(getWorkflowExecutionDetailsProps(defaultArgs).discoveriesCount).toBe(8);
  });

  it('converts averageSuccessfulDurationNanoseconds to averageSuccessfulDurationMs', () => {
    expect(getWorkflowExecutionDetailsProps(defaultArgs).averageSuccessfulDurationMs).toBe(2000);
  });

  it('parses localStorageAttackDiscoveryMaxAlerts into configuredMaxAlerts', () => {
    expect(getWorkflowExecutionDetailsProps(defaultArgs).configuredMaxAlerts).toBe(100);
  });

  it('resolves the connectorActionTypeId from the matching connector', () => {
    expect(getWorkflowExecutionDetailsProps(defaultArgs).connectorActionTypeId).toBe('.gen-ai');
  });

  it('maps the successful_generations to successfulGenerations', () => {
    expect(getWorkflowExecutionDetailsProps(defaultArgs).successfulGenerations).toBe(3);
  });

  it('forwards the workflowId', () => {
    expect(getWorkflowExecutionDetailsProps(defaultArgs).workflowId).toBe('workflow-123');
  });
});

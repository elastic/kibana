/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoverySchedule } from '@kbn/discoveries-schemas';

import { transformAttackDiscoveryScheduleToAttackDiscoverySchedule } from './transform_attack_discovery_schedule';

const baseAttackDiscoverySchedule: AttackDiscoverySchedule = {
  actions: [],
  created_at: '2025-04-09T08:51:04.697Z',
  created_by: 'elastic',
  enabled: true,
  id: 'test-id',
  name: 'Test Schedule',
  params: {
    alerts_index_pattern: '.alerts-security.alerts-default',
    api_config: {
      action_type_id: '.gen-ai',
      connector_id: 'test-connector',
      model: 'gpt-4',
      name: 'Test Connector',
    },
    end: 'now',
    size: 100,
    start: 'now-24h',
  },
  schedule: { interval: '24h' },
  updated_at: '2025-04-09T21:10:16.483Z',
  updated_by: 'elastic',
};

describe('transformAttackDiscoveryScheduleToAttackDiscoverySchedule', () => {
  it('transforms basic schedule fields correctly', () => {
    const result = transformAttackDiscoveryScheduleToAttackDiscoverySchedule(
      baseAttackDiscoverySchedule
    );

    expect(result.id).toBe('test-id');
    expect(result.name).toBe('Test Schedule');
    expect(result.enabled).toBe(true);
    expect(result.createdBy).toBe('elastic');
    expect(result.updatedBy).toBe('elastic');
    expect(result.schedule.interval).toBe('24h');
  });

  it('transforms apiConfig from snake_case to camelCase', () => {
    const result = transformAttackDiscoveryScheduleToAttackDiscoverySchedule(
      baseAttackDiscoverySchedule
    );

    expect(result.params.apiConfig).toEqual({
      actionTypeId: '.gen-ai',
      connectorId: 'test-connector',
      defaultSystemPromptId: undefined,
      model: 'gpt-4',
      name: 'Test Connector',
      provider: undefined,
    });
  });

  it('includes workflowConfig when workflow_config is present', () => {
    const scheduleWithWorkflowConfig: AttackDiscoverySchedule = {
      ...baseAttackDiscoverySchedule,
      params: {
        ...baseAttackDiscoverySchedule.params,
        workflow_config: {
          alert_retrieval_workflow_ids: ['wf-1', 'wf-2'],
          alert_retrieval_mode: 'custom_only',
          validation_workflow_id: 'custom-validate',
        },
      },
    };

    const result = transformAttackDiscoveryScheduleToAttackDiscoverySchedule(
      scheduleWithWorkflowConfig
    );

    expect(result.params.workflowConfig).toEqual({
      alertRetrievalWorkflowIds: ['wf-1', 'wf-2'],
      alertRetrievalMode: 'custom_only',
      validationWorkflowId: 'custom-validate',
    });
  });

  it('sets workflowConfig to undefined when workflow_config is not present', () => {
    const result = transformAttackDiscoveryScheduleToAttackDiscoverySchedule(
      baseAttackDiscoverySchedule
    );

    expect(result.params.workflowConfig).toBeUndefined();
  });

  it('handles workflow_config with default values', () => {
    const scheduleWithDefaults: AttackDiscoverySchedule = {
      ...baseAttackDiscoverySchedule,
      params: {
        ...baseAttackDiscoverySchedule.params,
        workflow_config: {
          alert_retrieval_workflow_ids: [],
          alert_retrieval_mode: 'custom_query',
          validation_workflow_id: 'default',
        },
      },
    };

    const result = transformAttackDiscoveryScheduleToAttackDiscoverySchedule(scheduleWithDefaults);

    expect(result.params.workflowConfig).toEqual({
      alertRetrievalWorkflowIds: [],
      alertRetrievalMode: 'custom_query',
      validationWorkflowId: 'default',
    });
  });
});

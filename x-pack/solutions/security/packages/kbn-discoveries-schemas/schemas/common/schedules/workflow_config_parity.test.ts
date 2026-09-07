/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateAttackDiscoveryScheduleRequestBody } from '../../routes/post/schedules/create_schedule_route.gen';
import { GetAttackDiscoveryScheduleResponse } from '../../routes/get/schedules/get_schedule_route.gen';
import { UpdateAttackDiscoveryScheduleRequestBody } from '../../routes/put/schedules/update_schedule_route.gen';
import type { WorkflowConfig } from './schedule_types.gen';

/**
 * CRUD4 — schema-parity.
 *
 * Every composite `workflow_config` field MUST survive `parse` unchanged through
 * the create-props, update-props, and GET-response schemas. Zod strips unknown
 * keys, so a field that is missing from the schema would be silently dropped on
 * save/read — this guards against that regression at all three schema seams.
 *
 * A fully-populated, NON-default `workflow_config` is used so that a stripped
 * field cannot coincide with its default value and pass undetected.
 */
const fullyPopulatedWorkflowConfig: WorkflowConfig = {
  alert_retrieval_mode: 'esql',
  alert_retrieval_workflow_ids: ['wf-1', 'wf-2'],
  alert_retrieval_workflows_enabled: true,
  default_retrieval_enabled: true,
  esql_query: 'FROM .alerts-security.alerts-default | LIMIT 100',
  skill_enabled: false,
  validation_workflow_id: 'custom-validate',
};

const baseParams = {
  alerts_index_pattern: '.alerts-security.alerts-default',
  api_config: {
    action_type_id: '.gen-ai',
    connector_id: 'test-connector',
  },
  size: 50,
  workflow_config: fullyPopulatedWorkflowConfig,
};

describe('workflow_config schema parity (create / update / GET)', () => {
  it('preserves every workflow_config field through CreateAttackDiscoveryScheduleRequestBody', () => {
    const parsed = CreateAttackDiscoveryScheduleRequestBody.parse({
      name: 'parity-create',
      params: baseParams,
      schedule: { interval: '24h' },
    });

    expect(parsed.params.workflow_config).toEqual(fullyPopulatedWorkflowConfig);
  });

  it('preserves every workflow_config field through UpdateAttackDiscoveryScheduleRequestBody', () => {
    const parsed = UpdateAttackDiscoveryScheduleRequestBody.parse({
      actions: [],
      name: 'parity-update',
      params: baseParams,
      schedule: { interval: '24h' },
    });

    expect(parsed.params.workflow_config).toEqual(fullyPopulatedWorkflowConfig);
  });

  it('preserves every workflow_config field through GetAttackDiscoveryScheduleResponse', () => {
    const parsed = GetAttackDiscoveryScheduleResponse.parse({
      actions: [],
      created_at: '2025-04-09T08:51:04.697Z',
      created_by: 'elastic',
      enabled: true,
      id: 'test-id',
      name: 'parity-get',
      params: baseParams,
      schedule: { interval: '24h' },
      updated_at: '2025-04-09T21:10:16.483Z',
      updated_by: 'elastic',
    });

    expect(parsed.params.workflow_config).toEqual(fullyPopulatedWorkflowConfig);
  });

  it('does not strip esql_query (the only field without a schema default)', () => {
    const parsed = CreateAttackDiscoveryScheduleRequestBody.parse({
      name: 'parity-esql',
      params: baseParams,
      schedule: { interval: '24h' },
    });

    expect(parsed.params.workflow_config?.esql_query).toBe(fullyPopulatedWorkflowConfig.esql_query);
  });
});

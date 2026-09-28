/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttackDiscoveryScheduleCreateProps,
  AttackDiscoveryScheduleUpdateProps,
} from '@kbn/discoveries-schemas';

import { getScheduleMock } from '../__mocks__/schedules.mock';
import { transformCreatePropsFromApi } from './transform_create_props_from_api';
import { transformScheduleToApi } from './transform_schedule_to_api';
import { transformUpdatePropsFromApi } from './transform_update_props_from_api';

/**
 * CRUD5 — server persistence guard.
 *
 * Guards seams 3-5 (wire schema -> server transforms -> persistence -> GET)
 * independently of the UI. The Saved Object persistence layer stores `params`
 * verbatim, so it is modeled here as an identity on `params` — the only fields
 * that can drop a value are the snake_case<->camelCase transforms on either
 * side of persistence.
 *
 * A fully-populated, NON-default `workflow_config` is used so a dropped field
 * cannot coincide with its default value and pass undetected.
 */
const workflowConfig = {
  alert_retrieval_mode: 'esql' as const,
  alert_retrieval_workflow_ids: ['wf-1', 'wf-2'],
  alert_retrieval_workflows_enabled: true,
  default_retrieval_enabled: true,
  esql_query: 'FROM .alerts-security.alerts-default | LIMIT 100',
  skill_enabled: false,
  validation_workflow_id: 'custom-validate',
};

describe('workflow_config server persistence round-trip (create/update -> persist -> GET)', () => {
  it('returns the created workflow_config byte-for-byte via the GET response transform', () => {
    const apiCreateProps: AttackDiscoveryScheduleCreateProps = {
      enabled: true,
      name: 'persistence-create',
      params: {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector',
        },
        size: 50,
        workflow_config: workflowConfig,
      },
      schedule: { interval: '24h' },
    };

    // snake_case API -> camelCase DataClient props
    const internalCreateProps = transformCreatePropsFromApi(apiCreateProps);

    // Persistence is modeled as identity on params (the SO stores params verbatim).
    const persistedSchedule = getScheduleMock({
      params: internalCreateProps.params,
    });

    // camelCase persisted schedule -> snake_case GET response
    const getResponse = transformScheduleToApi(persistedSchedule);

    expect(getResponse.params.workflow_config).toEqual(workflowConfig);
  });

  it('returns the updated workflow_config byte-for-byte via the GET response transform', () => {
    const apiUpdateProps: AttackDiscoveryScheduleUpdateProps = {
      actions: [],
      name: 'persistence-update',
      params: {
        alerts_index_pattern: '.alerts-security.alerts-default',
        api_config: {
          action_type_id: '.gen-ai',
          connector_id: 'test-connector',
        },
        size: 50,
        workflow_config: workflowConfig,
      },
      schedule: { interval: '24h' },
    };

    // snake_case API -> camelCase DataClient props
    const internalUpdateProps = transformUpdatePropsFromApi(apiUpdateProps);

    // Persistence is modeled as identity on params (the SO stores params verbatim).
    const persistedSchedule = getScheduleMock({
      params: internalUpdateProps.params,
    });

    // camelCase persisted schedule -> snake_case GET response
    const getResponse = transformScheduleToApi(persistedSchedule);

    expect(getResponse.params.workflow_config).toEqual(workflowConfig);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AT_LEAST_ONE_RETRIEVAL_TOGGLE_MESSAGE } from '@kbn/discoveries-schemas';

import { validateRequest } from '.';

describe('validateRequest', () => {
  const validRequestBody = {
    alerts_index_pattern: '.alerts-security.alerts-default',
    api_config: {
      action_type_id: '.gen-ai',
      connector_id: 'test-connector-id',
    },
    type: 'attack_discovery',
  };

  it('returns a failure when request contains pre-retrieved alerts', () => {
    const result = validateRequest({ requestBody: { ...validRequestBody, alerts: [] } });

    expect(result).toEqual({
      body: {
        message:
          'Pre-retrieved alerts are not supported on this endpoint. Remove the alerts property from the request body.',
      },
      ok: false,
    });
  });

  it('returns a failure when schema validation fails', () => {
    const result = validateRequest({ requestBody: {} });

    expect(result.ok).toBe(false);
  });

  it('returns a failure when no alert retrieval method is specified (all toggles off)', () => {
    const result = validateRequest({
      requestBody: {
        ...validRequestBody,
        workflow_config: {
          alert_retrieval_workflows_enabled: false,
          default_retrieval_enabled: false,
          skill_enabled: false,
        },
      },
    });

    expect(result).toEqual({
      body: {
        message: AT_LEAST_ONE_RETRIEVAL_TOGGLE_MESSAGE,
      },
      ok: false,
    });
  });

  it('returns a failure when alerts_index_pattern is empty', () => {
    const result = validateRequest({
      requestBody: {
        ...validRequestBody,
        alerts_index_pattern: '',
      },
    });

    expect(result).toEqual({
      body: {
        message: 'alerts_index_pattern is required for pipeline kickoff',
      },
      ok: false,
    });
  });

  it('returns validated requestBody and a workflowConfig that defaults to the skill toggle enabled', () => {
    const result = validateRequest({ requestBody: validRequestBody });

    expect(result).toEqual({
      ok: true,
      requestBody: expect.objectContaining({
        alerts_index_pattern: '.alerts-security.alerts-default',
      }),
      workflowConfig: {
        alert_retrieval_mode: 'custom_query',
        alert_retrieval_workflow_ids: [],
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: false,
        skill_enabled: true,
        validation_workflow_id: 'default',
      },
    });
  });

  it('accepts the skill toggle without requiring esql_query or custom workflow ids', () => {
    const result = validateRequest({
      requestBody: {
        ...validRequestBody,
        workflow_config: {
          alert_retrieval_workflows_enabled: false,
          default_retrieval_enabled: false,
          skill_enabled: true,
        },
      },
    });

    expect(result.ok).toBe(true);
  });
});

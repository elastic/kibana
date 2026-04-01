/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  it('returns a failure when no alert retrieval method is specified', () => {
    const result = validateRequest({
      requestBody: {
        ...validRequestBody,
        workflow_config: {
          alert_retrieval_workflow_ids: [],
          default_alert_retrieval_mode: 'disabled',
          validation_workflow_id: 'default',
        },
      },
    });

    expect(result).toEqual({
      body: {
        message:
          'At least one alert retrieval method must be specified: either set default_alert_retrieval_mode to a value other than "disabled", or provide alert_retrieval_workflow_ids',
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

  it('returns a failure when provided mode is used without provided_context', () => {
    const result = validateRequest({
      requestBody: {
        ...validRequestBody,
        workflow_config: {
          alert_retrieval_workflow_ids: [],
          default_alert_retrieval_mode: 'provided',
          validation_workflow_id: 'default',
        },
      },
    });

    expect(result).toEqual({
      body: {
        message:
          'provided_context is required in workflow_config when default_alert_retrieval_mode is "provided"',
      },
      ok: false,
    });
  });

  it('returns a failure when provided mode is used with an empty provided_context', () => {
    const result = validateRequest({
      requestBody: {
        ...validRequestBody,
        workflow_config: {
          alert_retrieval_workflow_ids: [],
          default_alert_retrieval_mode: 'provided',
          provided_context: [],
          validation_workflow_id: 'default',
        },
      },
    });

    expect(result.ok).toBe(false);
  });

  it('returns success when provided mode has valid provided_context', () => {
    const result = validateRequest({
      requestBody: {
        ...validRequestBody,
        workflow_config: {
          alert_retrieval_workflow_ids: [],
          default_alert_retrieval_mode: 'provided',
          provided_context: ['alert context string 1', 'alert context string 2'],
          validation_workflow_id: 'default',
        },
      },
    });

    expect(result).toEqual({
      ok: true,
      requestBody: expect.objectContaining({
        alerts_index_pattern: '.alerts-security.alerts-default',
      }),
      workflowConfig: {
        alert_retrieval_workflow_ids: [],
        default_alert_retrieval_mode: 'provided',
        provided_context: ['alert context string 1', 'alert context string 2'],
        validation_workflow_id: 'default',
      },
    });
  });

  it('returns validated requestBody and normalized workflowConfig', () => {
    const result = validateRequest({ requestBody: validRequestBody });

    expect(result).toEqual({
      ok: true,
      requestBody: expect.objectContaining({
        alerts_index_pattern: '.alerts-security.alerts-default',
      }),
      workflowConfig: {
        alert_retrieval_workflow_ids: [],
        default_alert_retrieval_mode: 'custom_query',
        validation_workflow_id: 'default',
      },
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WORKFLOW_ATTACK_DISCOVERY_ERROR_EVENT,
  WORKFLOW_ATTACK_DISCOVERY_SUCCESS_EVENT,
} from '@kbn/discoveries/impl/lib/telemetry/event_based_telemetry';

import {
  ATTACK_DISCOVERY_ERROR_EVENT,
  ATTACK_DISCOVERY_SUCCESS_EVENT,
} from './event_based_telemetry';

describe('ATTACK_DISCOVERY_SUCCESS_EVENT', () => {
  it('shares the eventType with the workflow-augmented success event', () => {
    expect(ATTACK_DISCOVERY_SUCCESS_EVENT.eventType).toEqual(
      WORKFLOW_ATTACK_DISCOVERY_SUCCESS_EVENT.eventType
    );
  });

  it('accepts the workflow-only "alert_retrieval_mode" key', () => {
    expect(ATTACK_DISCOVERY_SUCCESS_EVENT.schema).toHaveProperty('alert_retrieval_mode');
  });

  it('accepts the workflow-only "hallucinations_filtered_count" key', () => {
    expect(ATTACK_DISCOVERY_SUCCESS_EVENT.schema).toHaveProperty('hallucinations_filtered_count');
  });

  it('registers a schema that is a superset of every key the workflow producer can emit', () => {
    const registeredKeys = Object.keys(ATTACK_DISCOVERY_SUCCESS_EVENT.schema);
    const workflowKeys = Object.keys(WORKFLOW_ATTACK_DISCOVERY_SUCCESS_EVENT.schema);

    expect(workflowKeys.filter((key) => !registeredKeys.includes(key))).toEqual([]);
  });
});

describe('ATTACK_DISCOVERY_ERROR_EVENT', () => {
  it('shares the eventType with the workflow-augmented error event', () => {
    expect(ATTACK_DISCOVERY_ERROR_EVENT.eventType).toEqual(
      WORKFLOW_ATTACK_DISCOVERY_ERROR_EVENT.eventType
    );
  });

  it('registers a schema that is a superset of every key the workflow producer can emit', () => {
    const registeredKeys = Object.keys(ATTACK_DISCOVERY_ERROR_EVENT.schema);
    const workflowKeys = Object.keys(WORKFLOW_ATTACK_DISCOVERY_ERROR_EVENT.schema);

    expect(workflowKeys.filter((key) => !registeredKeys.includes(key))).toEqual([]);
  });
});

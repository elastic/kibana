/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, ScoutLogger } from '@kbn/scout-security';

/**
 * Data streams the endpoint package creates after EPM install. Event Filters
 * and Endpoint Exceptions field autocomplete reads field caps from these
 * patterns (`logs-endpoint.events.*`, `logs-endpoint.alerts-*`). Cypress
 * populated them via `indexEndpointHosts`; this suite does not enroll hosts.
 *
 * Seeded fields must stay in sync with `artifact_tabs_test_data.ts` and
 * `policy_artifacts.ts` form fills: `@timestamp` (Event Filters create),
 * `agent.version` (Endpoint Exceptions create), `process.name` (API-created
 * Event Filters / Endpoint Exceptions items).
 *
 * These targets are data streams: index only accepts `op_type: 'create'`, and
 * delete-by-id cannot use the stream name. `agent.id` is the teardown marker.
 */
const ENDPOINT_EVENTS_INDEX = 'logs-endpoint.events.process-default';
const ENDPOINT_ALERTS_INDEX = 'logs-endpoint.alerts-default';
const FIELD_CAPS_SEED_AGENT_ID = 'scout-edr-artifacts-field-caps-seed';

const FIELD_CAPS_DOC = {
  '@timestamp': new Date().toISOString(),
  agent: { id: FIELD_CAPS_SEED_AGENT_ID, version: '8.16.0', type: 'endpoint' },
  event: { kind: 'event' },
  process: { name: 'notepad.exe' },
};

export const seedEndpointFieldCapsDocs = async (
  esClient: EsClient,
  log: ScoutLogger
): Promise<void> => {
  // Reused stacks and a skipped teardown would 409 on `create` otherwise.
  await deleteEndpointFieldCapsDocs(esClient, log);
  await indexFieldCapsDoc(esClient, log, ENDPOINT_EVENTS_INDEX, FIELD_CAPS_DOC);
  await indexFieldCapsDoc(esClient, log, ENDPOINT_ALERTS_INDEX, {
    ...FIELD_CAPS_DOC,
    event: { kind: 'alert' },
  });
};

export const deleteEndpointFieldCapsDocs = async (
  esClient: EsClient,
  log: ScoutLogger
): Promise<void> => {
  await deleteFieldCapsDocs(esClient, log, ENDPOINT_EVENTS_INDEX);
  await deleteFieldCapsDocs(esClient, log, ENDPOINT_ALERTS_INDEX);
};

const indexFieldCapsDoc = async (
  esClient: EsClient,
  log: ScoutLogger,
  index: string,
  document: Record<string, unknown>
): Promise<void> => {
  log.debug(`[setup] seeding field-caps document into ${index}`);
  await esClient.index({
    index,
    document,
    refresh: 'wait_for',
    op_type: 'create',
  });
};

const deleteFieldCapsDocs = async (
  esClient: EsClient,
  log: ScoutLogger,
  index: string
): Promise<void> => {
  log.debug(`[teardown] deleting field-caps documents from ${index}`);
  await esClient.deleteByQuery(
    {
      index,
      query: { term: { 'agent.id': FIELD_CAPS_SEED_AGENT_ID } },
      refresh: true,
      wait_for_completion: true,
      conflicts: 'proceed',
      ignore_unavailable: true,
    },
    { ignore: [404] }
  );
};

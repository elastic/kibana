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
 */
const ENDPOINT_EVENTS_INDEX = 'logs-endpoint.events.process-default';
const ENDPOINT_ALERTS_INDEX = 'logs-endpoint.alerts-default';

const FIELD_CAPS_DOC = {
  '@timestamp': new Date().toISOString(),
  agent: { version: '8.16.0', type: 'endpoint' },
  event: { kind: 'event' },
  process: { name: 'notepad.exe' },
};

export const seedEndpointFieldCapsDocs = async (
  esClient: EsClient,
  log: ScoutLogger
): Promise<void> => {
  await indexFieldCapsDoc(esClient, log, ENDPOINT_EVENTS_INDEX, FIELD_CAPS_DOC);
  await indexFieldCapsDoc(esClient, log, ENDPOINT_ALERTS_INDEX, {
    ...FIELD_CAPS_DOC,
    event: { kind: 'alert' },
  });
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

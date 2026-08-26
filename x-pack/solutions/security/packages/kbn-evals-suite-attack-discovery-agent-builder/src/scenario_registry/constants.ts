/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Seed label for scenario-registry fixtures. */
export const AD2_SCENARIO_SEED_LABEL = 'ad-scenario-registry-2026-07';

export const AD2_SCENARIO_ID_PREFIX = 'ad-scenario-';

export const AD2_ALERTS_INDEX = '.alerts-security.alerts-default';

export const AD2_PROCESS_EVENTS_INDEX = 'logs-endpoint.events.process-default';

export const AD2_NETWORK_EVENTS_INDEX = 'logs-endpoint.events.network-default';

export const AD2_FILE_EVENTS_INDEX = 'logs-endpoint.events.file-default';

export const AD2_SCENARIO_RAW_INDICES = [
  AD2_PROCESS_EVENTS_INDEX,
  AD2_NETWORK_EVENTS_INDEX,
  AD2_FILE_EVENTS_INDEX,
] as const;

export const AD2_SCENARIO_ALL_INDICES = [AD2_ALERTS_INDEX, ...AD2_SCENARIO_RAW_INDICES] as const;

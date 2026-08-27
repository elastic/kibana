/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Index holding Detonate task documents. `tasks` is a very generic name to hard-code, so it is
 * kept in a single constant to make promoting it to an advanced setting a one-line change.
 */
export const DETONATE_TASKS_INDEX = 'tasks*' as const;

/** Only tasks that reached the summary worker have their alert counts denormalized. */
export const DETONATE_COMPLETED_WORKER = 'detonate.workers.make_summary' as const;

export const DETONATE_INTERNAL_BASE_PATH = '/internal/detonate' as const;
export const DETONATE_AI_SUMMARY_PATH = `${DETONATE_INTERNAL_BASE_PATH}/ai_summary` as const;

/**
 * Endpoint protections that can fire during a detonation, as they appear in
 * `task.production_endpoint_alert_groups.event_code`.
 */
export const DETONATE_PROTECTION_EVENT_CODES = [
  'malicious_file',
  'memory_signature',
  'behavior',
  'shellcode_thread',
  'ransomware',
] as const;

export type ProtectionEventCode = (typeof DETONATE_PROTECTION_EVENT_CODES)[number];

/** Event codes come back from ES|QL as free-form strings, so they are narrowed before use. */
export const isProtectionEventCode = (value: string): value is ProtectionEventCode =>
  (DETONATE_PROTECTION_EVENT_CODES as readonly string[]).includes(value);

/** Maximum rows pulled for the detonations table. */
export const DETONATE_TABLE_LIMIT = 500;

/** Families shown in the top-families chart. */
export const DETONATE_TOP_FAMILIES_LIMIT = 10;

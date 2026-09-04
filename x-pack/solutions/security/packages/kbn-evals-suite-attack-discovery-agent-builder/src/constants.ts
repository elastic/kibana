/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tool id for the Attack Discovery run tool.
 */
export const ATTACK_DISCOVERY_RUN_TOOL_ID = 'security.attack-discovery.run';

/**
 * Whether an example is expected to produce an Attack Discovery at all.
 *
 * `missing-alert-retrieval` and `status-only` never call
 * `security.attack-discovery.run` by design, so evaluators that score the
 * discovery itself must report `N/A` for them instead of `0` — a `0` would be
 * indistinguishable from a genuine failure and would pin the aggregate at a
 * ceiling no run can lift. Keyed off the expected tool path rather than
 * `triageType`, because `missing-alert-retrieval` shares `live-retrieval` with
 * an example that does produce a discovery.
 */
export const expectsAttackDiscovery = (expectedToolPath: string[] | undefined): boolean =>
  (expectedToolPath ?? []).includes(ATTACK_DISCOVERY_RUN_TOOL_ID);

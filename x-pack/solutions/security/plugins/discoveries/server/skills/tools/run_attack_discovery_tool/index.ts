/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: real implementation lands in PR8 (Skills). FF-off safe.

export const RUN_ATTACK_DISCOVERY_TOOL_ID = 'security.attack-discovery.run' as const;

export interface RunAttackDiscoveryToolDeps {
  [key: string]: unknown;
}

export const getRunAttackDiscoveryTool = (_deps: RunAttackDiscoveryToolDeps): unknown => undefined;

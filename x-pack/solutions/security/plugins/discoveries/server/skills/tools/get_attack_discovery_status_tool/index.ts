/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: the real skill tool implementation lands in PR8 (Skills). PR3
// imports the symbols (id + factory + type) so attack_discovery_generator_skill
// and register_skills can type-check FF-off. The tool is never registered
// at runtime when the feature flag is OFF.

export const GET_ATTACK_DISCOVERY_STATUS_TOOL_ID = 'security.attack-discovery.get_status' as const;

export interface WorkflowExecutionLookup {
  lookup: (executionUuid: string) => Promise<unknown | undefined>;
}

export const getAttackDiscoveryStatusTool = (_deps: unknown): unknown => undefined;

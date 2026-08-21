/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default Elastic AI Agent ID used for Agent Builder evals.
 *
 * Mirrors the value shipped in `@kbn/agent-builder-common` on `upstream/main`.
 * Once the PR branch catches up, replace with:
 *   import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
 */
export const agentBuilderDefaultAgentId = 'elastic-ai-agent';

/**
 * Namespaced tool IDs for the threat-intel-hunt skill.
 *
 * These MUST stay in sync with the server-side definitions in
 * `security_solution/server/agent_builder/skills/threat_intel_hunt/`.
 */
export const THREAT_INTEL_TOOL_IDS = {
  hunt_behavior: 'threat_intel.hunt_behavior',
  hunt_orchestrator: 'threat_intel.hunt_orchestrator',
} as const;

/** Index where the hunt_orchestrator tool persists threat-intel findings. */
export const THREAT_INTEL_FINDINGS_INDEX = '.kibana-threat-intel-hunt-findings';

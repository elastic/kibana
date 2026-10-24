/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Mirrors the tool ids exported by the endpoint forensic analysis skill
 * (`security_solution/server/agent_builder/skills/endpoint_forensic_analysis/endpoint_forensic_analysis_skill.ts`).
 * The plugin's server entry cannot be imported from a functional-tests package,
 * so the contract is pinned here and by `endpoint_forensic_tool_ids.test.ts`.
 */
export const ENDPOINT_FORENSIC_DISCOVER_TELEMETRY_TOOL_ID =
  'security.endpoint_forensic.discover_telemetry';
export const ENDPOINT_FORENSIC_EXTRACT_IOCS_TOOL_ID = 'security.endpoint_forensic.extract_iocs';

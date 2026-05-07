/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantTool } from '@kbn/elastic-assistant-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import { PRODUCT_DOCUMENTATION_TOOL } from './product_docs/product_documentation_tool';
import { GENERATE_ESQL_TOOL } from './esql/generate_esql_tool';
import { ASK_ABOUT_ESQL_TOOL } from './esql/ask_about_esql_tool';
import { ALERT_COUNTS_TOOL } from './alert_counts/alert_counts_tool';
import { OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL } from './open_and_acknowledged_alerts/open_and_acknowledged_alerts_tool';
import { KNOWLEDGE_BASE_RETRIEVAL_TOOL } from './knowledge_base/knowledge_base_retrieval_tool';
import { KNOWLEDGE_BASE_WRITE_TOOL } from './knowledge_base/knowledge_base_write_tool';
import { SECURITY_LABS_KNOWLEDGE_BASE_TOOL } from './security_labs/security_labs_tool';
import { ENTITY_RISK_SCORE_TOOL } from './entity_risk_score/entity_risk_score';
import { INTEGRATION_KNOWLEDGE_TOOL } from './integration_knowledge/integration_knowledge_tool';
import { ASSET_MISCONFIGURATIONS_TOOL } from './asset_misconfigurations/asset_misconfigurations_tool';
import { buildMitreAttackTool } from './mitre_attack/mitre_attack_tool';
import type { MitreAttackDataService } from '../../lib/mitre_attack';

// any new tool should also be added to telemetry schema in
// x-pack/solutions/security/plugins/elastic_assistant/server/lib/telemetry/event_based_telemetry.ts
export const assistantTools: AssistantTool[] = [
  ALERT_COUNTS_TOOL,
  KNOWLEDGE_BASE_RETRIEVAL_TOOL,
  KNOWLEDGE_BASE_WRITE_TOOL,
  GENERATE_ESQL_TOOL,
  ASK_ABOUT_ESQL_TOOL,
  OPEN_AND_ACKNOWLEDGED_ALERTS_TOOL,
  PRODUCT_DOCUMENTATION_TOOL,
  SECURITY_LABS_KNOWLEDGE_BASE_TOOL,
  ENTITY_RISK_SCORE_TOOL,
  INTEGRATION_KNOWLEDGE_TOOL,
  ASSET_MISCONFIGURATIONS_TOOL,
];

interface AdditionalAssistantToolsDeps {
  mitreAttackDataService: MitreAttackDataService;
  getSpaceId: (request: KibanaRequest) => string;
  managedMitreSourceEnabled: boolean;
}

/**
 * Tools that depend on plugin-scoped services (e.g. MITRE_ATTACK_TOOL needs
 * the `MitreAttackDataService`) are built lazily at start time so they can
 * close over stable deps.
 */
export const buildAdditionalAssistantTools = (
  deps: AdditionalAssistantToolsDeps
): AssistantTool[] => {
  const tools: AssistantTool[] = [];
  if (deps.managedMitreSourceEnabled) {
    tools.push(
      buildMitreAttackTool({
        mitreAttackDataService: deps.mitreAttackDataService,
        getSpaceId: deps.getSpaceId,
      })
    );
  }
  return tools;
};

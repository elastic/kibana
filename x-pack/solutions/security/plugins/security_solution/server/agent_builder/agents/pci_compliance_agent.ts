/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { Logger } from '@kbn/logging';
import { PCI_COMPLIANCE_AGENT_ID } from '../../../common/constants';
import {
  PCI_COMPLIANCE_CHECK_TOOL_ID,
  PCI_COMPLIANCE_REPORT_TOOL_ID,
  PCI_SCOPE_DISCOVERY_TOOL_ID,
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
} from '../tools';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';

const PLATFORM_TOOL_IDS = [
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
  platformCoreTools.cases,
  platformCoreTools.productDocumentation,
  platformCoreTools.generateEsql,
  platformCoreTools.executeEsql,
];

const SECURITY_TOOL_IDS = [
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  PCI_SCOPE_DISCOVERY_TOOL_ID,
  PCI_COMPLIANCE_CHECK_TOOL_ID,
  PCI_COMPLIANCE_REPORT_TOOL_ID,
];

export const PCI_COMPLIANCE_AGENT_TOOL_IDS = [...PLATFORM_TOOL_IDS, ...SECURITY_TOOL_IDS];

export const createPciComplianceAgent = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltInAgentDefinition => {
  return {
    id: PCI_COMPLIANCE_AGENT_ID,
    avatar_icon: 'logoSecurity',
    name: 'PCI Compliance Agent',
    description:
      'Agent specialized in PCI DSS compliance evaluation, targeted audits, and compliance reporting.',
    labels: ['security', 'compliance'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    configuration: {
      instructions: `You are a PCI DSS compliance analyst for Elastic Security.

Your role is to evaluate PCI DSS posture using data available in Elasticsearch. You support:
- Full checks across PCI DSS requirements 1 through 12
- Requirement-specific audits (for example network and identity controls)
- Red/Amber/Green reporting with evidence-backed findings and remediation guidance

Guidelines:
- Start by discovering available indices and data coverage.
- Use ECS-compatible fields first; for custom ingestion, inspect mappings and adapt queries.
- Distinguish data-backed findings from checks that require manual process validation.
- Always report data gaps and state any assumptions clearly.
- Keep recommendations actionable and aligned to PCI DSS control intent.
`,
      tools: [
        {
          tool_ids: PCI_COMPLIANCE_AGENT_TOOL_IDS,
        },
      ],
    },
  };
};

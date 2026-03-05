/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { Logger } from '@kbn/logging';
import { THREAT_HUNTING_AGENT_ID } from '../../../common/constants';
import {
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
} from '../tools';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';

const THREAT_HUNTING_INSTRUCTIONS = `You are a senior security analyst specializing in threat hunting, alert triage, and detection engineering within Elastic Security. Your role is to help security teams investigate threats, analyze alerts, profile entities, and create detection rules.

## Core Capabilities

### Threat Hunting
- Formulate hypotheses from threat intelligence, MITRE ATT&CK techniques, or anomalous observations
- Use ES|QL queries to iteratively explore data across security indices (logs-*, filebeat-*, winlogbeat-*, packetbeat-*, .alerts-security.alerts-*)
- Identify statistical anomalies and rare events using STATS, COUNT_DISTINCT, and percentile aggregations
- Search for indicators of compromise (IOCs): suspicious IPs, domains, file hashes, and process names
- Always scope queries with @timestamp ranges to avoid full index scans

### Alert Analysis
- Triage alerts by assessing severity, risk score, and MITRE technique before diving into investigation
- Find related alerts sharing entities (hosts, users, IPs) within a time window
- Enrich findings with Security Labs threat intelligence and entity risk scores
- Determine disposition: true positive (escalate), benign true positive (exception), or false positive (tune rule)

### Entity Investigation
- Profile users and hosts by analyzing authentication patterns, process execution, and network activity
- Assess entity risk using risk scores and asset criticality levels
- Track lateral movement by correlating entity activity across multiple hosts and time windows

## Investigation Workflow

1. **Assess** — Check alert severity, risk score, and MITRE technique
2. **Context** — Query related activity on the same host/user within a time window
3. **Enrich** — Check source IPs against threat intelligence, verify process hashes, review entity baselines
4. **Decide** — True positive → escalate | Benign TP → exception | False positive → tune rule
5. **Act** — Update alert status, create a case if escalating, or add an exception

## Best Practices
- Prefer ECS field names (process.name, event.action, source.ip) for cross-source portability
- Use LIMIT even in aggregations to prevent excessive output
- Always validate findings against known-good baselines before escalating
- Document analysis reasoning and next steps clearly
- When hunting, use 7-30 day time windows for behavioral pattern analysis`;

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
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
];

export const THREAT_HUNTING_AGENT_TOOL_IDS = [...PLATFORM_TOOL_IDS, ...SECURITY_TOOL_IDS];

export const createThreatHuntingAgent = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltInAgentDefinition => {
  return {
    id: THREAT_HUNTING_AGENT_ID,
    avatar_icon: 'logoSecurity',
    name: 'Threat Hunting Agent',
    description:
      'Agent specialized in security alert analysis and entity analysis tasks, including alert investigation, entity investigation and security documentation.',
    labels: ['security'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    configuration: {
      instructions: THREAT_HUNTING_INSTRUCTIONS,
      tools: [
        {
          tool_ids: THREAT_HUNTING_AGENT_TOOL_IDS,
        },
      ],
    },
  };
};

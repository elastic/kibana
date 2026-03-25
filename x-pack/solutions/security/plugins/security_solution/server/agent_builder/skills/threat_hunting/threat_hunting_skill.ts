/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
} from '../../tools';

export const getThreatHuntingSkill = () =>
  defineSkillType({
    id: 'threat-hunting',
    name: 'threat-hunting',
    basePath: 'skills/security/alerts',
    description:
      'Guide to proactive security threat hunting: alert analysis, entity investigation, attack pattern identification, and security documentation using Elastic Security data sources.',
    content: `# Threat Hunting Guide

## When to Use This Skill

Use this skill when:
- Conducting proactive threat hunts across the environment
- Investigating security alerts and determining their significance
- Performing entity-level analysis (host, user, IP) for suspicious activity
- Analyzing attack patterns and indicators of compromise
- Searching for evidence of lateral movement, persistence, or data exfiltration
- Producing security investigation documentation

## Threat Hunting Methodology

### 1. Hypothesis Formation
- Start with a hypothesis based on threat intelligence, recent alerts, or organizational risk areas
- Define the scope: time window, data sources, entity types, and attack techniques to investigate
- Prioritize based on entity risk scores and asset criticality

### 2. Data Collection
- Query security alerts for the relevant time window and entities
- Search attack discoveries for correlated findings
- Check entity risk scores to identify high-risk hosts and users
- Cross-reference with Elastic Security Labs for relevant threat research

### 3. Analysis
- Look for unusual authentication patterns and privilege escalation
- Identify suspicious process execution chains and living-off-the-land techniques
- Analyze network connections to rare or suspicious external domains
- Correlate activity across entity dimensions (host ↔ user ↔ IP)

### 4. Documentation
- Document all findings with supporting evidence
- Create investigation timelines for significant discoveries
- Escalate confirmed threats with severity assessment and recommended actions
- Record negative results to inform future hunting priorities

## Available Tools

### Security-Specific Tools
- **Alerts tool** — Search and analyze security alerts using natural language or structured queries
- **Attack Discovery Search** — Find attack discoveries related to specific alerts
- **Entity Risk Score** — Look up entity risk scores and contributing alert inputs
- **Security Labs Search** — Search Elastic Security Labs for threat research and intelligence

### Platform Tools
- **Search** — Query any Elasticsearch index with natural language
- **ES|QL** — Generate and execute ES|QL queries for advanced analysis
- **Cases** — Create and manage investigation cases
- **Product Documentation** — Search Elastic product documentation for guidance

## Response Formats

### Hunting Summary
Provide a concise summary of findings:

| Finding | Severity | Entities | Evidence |
| --- | --- | --- | --- |
| <description> | <critical/high/medium/low> | <affected entities> | <key evidence> |

### Entity Analysis
When analyzing entities, present risk context:

| Entity | Type | Risk Score | Risk Level | Key Signals |
| --- | --- | --- | --- | --- |
| <name> | <host/user/service> | <0-100> | <level> | <summary of risk inputs> |

## Best Practices
- Always check entity risk scores before deep-diving into alert analysis
- Cross-reference findings with Attack Discovery for correlated context
- Use Elastic Security Labs to understand known threat actor techniques
- Document your methodology so hunts are reproducible
- Prioritize investigation of high-risk entities and critical assets`,
    getRegistryTools: () => [
      // Platform tools
      platformCoreTools.search,
      platformCoreTools.listIndices,
      platformCoreTools.getIndexMapping,
      platformCoreTools.getDocumentById,
      platformCoreTools.cases,
      platformCoreTools.productDocumentation,
      platformCoreTools.generateEsql,
      platformCoreTools.executeEsql,
      // Security tools
      SECURITY_ALERTS_TOOL_ID,
      SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
      SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
      SECURITY_LABS_SEARCH_TOOL_ID,
    ],
  });

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { EntityAnalyticsRoutesDeps } from '../../../lib/entity_analytics/types';
import { getRiskScoreInlineTool } from './inline_tools';

export interface EntityAnalysisSkillsContext {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  kibanaVersion: string;
}

export const getEntityAnalysisSkill = (ctx: EntityAnalysisSkillsContext) =>
  defineSkillType({
    id: 'entity-analysis',
    name: 'entity-analysis',
    basePath: 'skills/security/entities',
    description: `Guide to analyzing security entities (hosts, users, services, generic). Analyze how an entity's risk score has changed over time (e.g. last 90 days), show the riskiest entity and its inputs, sort and rank the top security entities by risk scores, criticality, risk inputs and behaviors.`,
    content: `# Entity Analysis Guide

This skill helps you analyze security entites. Entities include hosts, users, services and generic. Each entity can have

- **Risk Score**: normalized score (0-100) indicating riskiness of an entity.
- **Risk Inputs**: list of highest-risk alerts and logs contributing to the risk score.
- **Risk History**: risk scores over time

## Important dependencies
- Risk score questions require the **Risk Engine** to be enabled and risk indices to exist.

## Entity Analysis Process

### 1. Choose the right tool based on what you need
- Use security.entity_analysis.risk_score to get current and historical risk scores, riskiest entities and risk inputs.

### 2. Respond clearly
- Provide the normalized risk score and criticality level
- Offer a short explanation of why the score is high/low
- Suggest next steps if needed (e.g., investigate the most relevant alerts)

## Best Practices
- Always use \`calculated_score_norm\` (0-100) when reporting risk scores
- Risk levels: Critical (highest), High, Moderate, Low, Unknown
- Higher scores indicate greater risk to the organization
- Document your analysis process and reasoning clearly
- Summarize contributing inputs (alerts and categories) at a high level
- Avoid listing noisy raw data; highlight the most relevant signals

## Response formats

### Top N entities
Provide a short table with the key fields:

| Entity | Type | Risk score (0-100) | Risk level | Criticality |
| --- | --- | --- | --- | --- |
| <id_value> | <identifierType> | <calculated_score_norm> | <calculated_level> | <criticality_level or "unknown"> |

Then add 1-2 bullets with key observations (e.g., highest criticality, biggest score gap).
`,
    getInlineTools: () => [getRiskScoreInlineTool(ctx)],
  });

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { EntityAnalyticsRoutesDeps } from '../../../lib/entity_analytics/types';
import {
  getRiskScoreInlineTool,
  getRiskScoreEsqlTool,
  getAssetCriticalityEsqlTool,
  getAssetCriticalityInlineTool,
} from './inline_tools';
import { SECURITY_GET_ENTITY_TOOL_ID, SECURITY_SEARCH_ENTITIES_TOOL_ID } from '../../tools';

// Feature flag controlling whether our tools try to dynamically generate ESQL queries based on the question asked of
// if they use controlled queries that we author and maintain.
export const FF_DYNAMICALLY_GENERATE_ESQL = false;

const ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD = 20; // Define a threshold for significant risk score change
export interface EntityAnalyticsSkillsContext {
  isEntityStoreV2Enabled: boolean;
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  kibanaVersion: string;
  logger: Logger;
}

const entityStoreV2Content = `
This skill provides a guide to investigating specific security entities (hosts, users, services, generic) by entity ID (EUID)
or by surfacing risky entities based on their risk scores, asset criticality levels and other behavioral and lifecycle attributes.

## When to Use This Skill

Use this skill when:
- Investigating the current behavior of a specific entity using its ID (EUID)
- Looking up the current profile for a specific entity using its ID (EUID), including risk score, asset criticality and watchlists
- Analyzing the historical behavior of a specific entity using its ID (EUID)
- Analyzing changes in an entity's risk score or behavior over time
- Discovering the riskiest entities in the environment based on risk scores and criticality levels
- Surfacing entities that require further investigation based on their attributes and behaviors

## Available Tools

### Get Entity Tool
- \`security.get_entity\` - Get the full profile for a security entity (host, user, service, generic) with a known entity ID (EUID).
    Also use this tool to get the profile for this entity over a time interval (e.g. last 90 days) or on a specific date (e.g. December 12, 2025).
    A full entity profile may include:
    - entity.id (EUID) - the unique identifier for this entity
    - entity.name - the name of this entity
    - entity.risk.calculated_score_norm (0-100) - the normalized risk score for this entity
    - entity.risk.calculated_level (critical, high, moderate, low, unknown)
    - asset.criticality (extreme_impact, high_impact, moderate_impact, low_impact, unknown)
    - entity.attributes.watchlists - watchlists that contain this entity
    - entity.attributes.managed - whether this entity is managed
    - entity.attributes.mfa_enabled - whether MFA is enabled for this entity
    - entity.attributes.asset - whether this entity is an asset
    - entity.behaviors.rule_names - detection rules associated with this entity
    - entity.behaviors.anomaly_job_ids - anomaly detection jobs that have detected this entity
    - entity.lifecycle.first_seen - first time this entity has been seen in the entity store
    - entity.lifecycle.last_activity - last time this entity has been active in the entity store
    - risk_score_inputs - the alert inputs that contributed to the risk score calculation for this entity.
    - profile_history - historical snapshot profiles for this entity over a specified time interval
    This tool may return multiple results if an exact match for the entity ID is not found.
    If multiple results are returned:
      - Provide a summary of the FIRST result.
      - You MUST mention the other results found and provide the COMPLETE entity ID for each

### Search Entities Tool
- \`security.search_entities\` - Search the entity store for security entities (host, user, service, generic) matching specific criteria.
    Use this tool to find entities based on:
    - normalized risk score range (0-100)
    - risk level (critical, high, moderate, low, unknown)
    - asset criticality level (extreme_impact, high_impact, moderate_impact, low_impact, unknown)
    - entity attributes (watchlists, managed status, MFA status, asset)
    - entity behaviors (behavior rule names, anomaly job IDs)
    - entity lifecycle timestamps (first seen, last activity)
    Do NOT use this tool if the entity ID (EUID) is known; use the \`security.get_entity\` tool instead.
    ALWAYS use real entities from the entity store, do not invent entities.
    ALWAYS use the \`security.get_entity\` after using this tool to get the full profile for each entity found.

## Entity Analysis Investigation Steps

### 1. Find entities to investigate
- If entity ID (EUID) is known, continue directly to the next step
- If not, use \`security.search_entities\` to find entities. Always use real entities from the entity store, do not invent entities.
- You MUST call \`security.search_entities\` with a 'riskScoreMin' parameter if the user is asking about risk scores or riskiness.
- You MUST call \`security.search_entities\` with a 'criticalityLevels' parameter if the user is asking about criticality.
- ONLY call \`security.search_entities\` with a 'riskScoreChangeInterval' parameter if the user is asking about changes or jumps in risk score.

### 2. Get entity profiles
For each entity ID, you MUST call \`security.get_entity\` get the full entity profile

- Identify if any time interval or specific date is needed for historical analysis
- Use \`security.get_entity\` to get the full entity profile, including risk score inputs
- If more than one profile is returned for an entity, order them chronologically to build a picture of entity behavior over time

You MUST use the \`security.get_entity\` tool to get entity profiles for EACH entity found in step 1. For example,
if 10 entities are found using \`security.search_entities\`, you MUST call \`security.get_entity\` 10 times to get the full profiles for each entity.

### 3. Interpret and summarize output
- For \`security.get_entity\` tool results, summarize the current profile and identify whether the entity is considered risky
- If the result contains 'risk_score_inputs', summarize the alerts that contributed to the risk score calculation
- If the result contains 'profile_history', summarize the history of this entity over time, which may include:
  - Whether the risk score has increased or decreased over time
  - Whether the entity asset criticality has become more or less critical over time
  - Whether the entity has been added to or removed from watchlists over time
  - Whether the entity has exhibited new behaviors or stopped exhibiting certain behaviors over time
- For \`security.search_entities\` tool results, summarize results in a table format. The table MUST have the following columns if data is available for them:
  - risk score
  - asset criticality
  - first_seen
  - last_seen
  Include columns for behavioral attributes if data exists and column is relevant to the user's prompt

### 4. Provide recommendation
- Recommend investigating external activities for user entities
- Recommend investigating vulnerabilities and exposures for host and service entities

## Examples

### Example 1: Riskiest Users

User query: Which users have the highest risk scores?

Steps:
1. Use the 'security.search_entities' tool to get the top N users sorted by their normalized risk scores.
2. For each user, use the 'security.get_entity' tool to get their full profile. If 10 entities are returned, you MUST call the 'security.get_entity' tool 10 times to get each user's profile.
3. Present the results in a table format showing entity ID, risk score, risk level, asset criticality level and any watchlists they belong to.

### Example 2: Risk Score Changes Over Time

User query: Who has had the biggest increase in risk score over the last 90 days?

Steps:
1. Use the 'security.search_entities' tool with a riskScoreChangeInterval of '90d' to find entities with risk score changes.
2. Analyze the results and identify which entities have had significant (greater than ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} score change)
   increases in risk score.
3. For each entity with significant risk score change, use the 'security.get_entity' tool with an interval of '90d' to get their full profile history.
4. Present the findings in a table format showing entity ID, previous risk score, current risk score, risk score change, and a summary of how their risk score has changed over the interval.

### Example 3: High Impact Assets

User query: What are the riskiest hosts in my environment that are high impact?

Steps:
1. Use the 'security.search_entities' tool to get the top N hosts sorted by their normalized risk scores, using parameter
criticalityLevels: ['high_impact', 'extreme_impact'] to filter for high impact.
2. Present the results in a table format showing entity ID, risk score, risk level, and asset criticality level

### Example 4: Risk Score History

User query: Has Cielo39's risk score changed significantly?

Steps:
1. Use the 'security.get_entity' tool with an interval of '30d' to fetch Cielo39's current profile and profile_history for the last 30 days
2. Analyze the risk scores in the profile history along with the current risk score to determine if the change in risk score is significant (e.g., greater than ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} points).
3. Summarize the trends in risk score changes (stable, increasing, decreasing) and present findings in a concise format showing the previous risk scores, current risk score, and whether the change is significant.

## Best Practices
- Always use \`calculated_score_norm\` (0-100) when reporting risk scores
- Provide the criticality level of the entity if available, otherwise report as "unknown"
- Risk levels: Critical (highest), High, Moderate, Low, Unknown
- An entity is considered risky if its normalized score is above 80
- Higher scores indicate greater risk to the organization
- A change in risk score greater than ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} points over an interval is considered significant
- An entity is considered high impact if its criticality level is "high_impact" or "extreme_impact"
- Document your analysis process and reasoning clearly
- Avoid listing noisy raw data; highlight the most relevant signals
- Offer a short explanation of why a risk score is considered high or low
- Suggest next steps if needed, for example:
  - Investigate relevant alerts contributing to risk score
  - Investigate external activities and movement for risky user entities
  - Investigating vulnerabilities and exposures for risky host and service entities

## Response formats

### Top N entities
Provide a short table with the key fields:

| Entity | Type | Risk score (0-100) | Risk level | Criticality |
| --- | --- | --- | --- | --- |
| <id_value> | <entity_type> | <calculated_score_norm> | <calculated_level> | <criticality_level or "unknown"> |

Then add 1-2 bullets with key observations (e.g., highest criticality, biggest score gap, which entities to investigate further).
`;

const legacyContent = `
## When to Use This Skill

Use this skill when:
- A user asks to find the riskiest entities (hosts, users, services, generic) in their environment
- A user wants to understand whether any entities have had a significant change in risk score
- You want to look up the asset criticality level for an entity

## Entity Analysis Process

### 1. Find the risky entities
- Use the 'security.entity_analytics.risk_score' tool to find the riskiest entities based on their normalized risk scores (0-100)
- These entities will be sorted by their normalized risk score (calculated_score_norm) in descending order
- When entity ID is provided and no results are found, you must call the tool again with another entity type to find the entity (e.g. if "john" is not found as a user entity, try finding "john" as a host or service entity type)

### 2. Analyze risk score changes over time
- Use the 'security.entity_analytics.risk_score' tool to analyze how an entity's risk score has changed over a specified time interval (e.g., last 30, 60, 90 days)
- Look for significant increases in risk score (e.g., greater than ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} points) to identify entities that may require further investigation

### 3. Retrieve asset criticality levels
- Use the 'security.entity_analytics.asset_criticality' tool to get the asset criticality level for a specific entity
- If no entity ID is provided, retrieve the most critical assets in the environment sorted by their criticality level

## Examples

### Example 1: Riskiest Users

User query: Which users have the highest risk scores?

Steps:
1. Use the 'security.entity_analytics.risk_score' tool to get the top N users sorted by their normalized risk scores.
2. Use the 'security.entity_analytics.asset_criticality' tool to get the asset criticality levels for these users
3. Present the results in a table format showing entity ID, risk score, risk level, and asset criticality level

### Example 2: Risk Score Changes Over Time

User query: Who has had the biggest increase in risk score over the last 90 days?

Steps:
1. Use the 'security.entity_analytics.risk_score' tool with a time interval of '90d' to find entities with risk score increases.
2. Present the findings in a table format showing entity ID, previous risk score, current risk score, and risk score change.

### Example 3: High Impact Assets

User query: What are the riskiest hosts in my environment that are high impact?

Steps:
1. Use the 'security.entity_analytics.risk_score' tool to get the top N hosts sorted by their normalized risk scores.
2. Use the 'security.entity_analytics.asset_criticality' tool to get the asset criticality levels for these hosts
3. Filter the results to only show hosts that have a criticality level of "high_impact" or "extreme_impact"
4. Present the results in a table format showing entity ID, risk score, risk level, and asset criticality level


### Example 4: Risk Score History

User query: Has Cielo39's risk score changed significantly?

Steps:
1. Use the 'security.entity_analytics.risk_score' tool with a time interval of '30d' to analyze Cielo39's risk score changes with host entityType
2. When no results are returned, use the 'security.entity_analytics.risk_score' tool again to analyze Cielo39's risk score changes with user entityType
3. When no results are returned, use the 'security.entity_analytics.risk_score' tool again to analyze Cielo39's risk score changes with service entityType
4. When results are returned, determine if the change in risk score is significant (e.g., greater than ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} points).
5. Present the findings in a concise format showing the previous risk score, current risk score, and whether the change is significant.

## Important dependencies
- Risk score questions require the **Risk Engine** to be enabled and risk indices to exist.
- Asset criticality questions require asset criticality data to be ingested into the entity analytics asset criticality index.

## Best Practices
- Always use \`calculated_score_norm\` (0-100) when reporting risk scores
- Provide the criticality level of the entity if available, otherwise report as "unknown"
- Risk levels: Critical (highest), High, Moderate, Low, Unknown
- An entity is considered risky if its normalized score is above 80
- Higher scores indicate greater risk to the organization
- A change in risk score greater than ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} points over an interval is considered significant
- Document your analysis process and reasoning clearly
- Avoid listing noisy raw data; highlight the most relevant signals
- Offer a short explanation of why the score is considered high or low
- Suggest next steps if needed (e.g., investigate the most relevant alerts)

## Response formats

### Top N entities
Provide a short table with the key fields:

| Entity | Type | Risk score (0-100) | Risk level | Criticality |
| --- | --- | --- | --- | --- |
| <id_value> | <entity_type> | <calculated_score_norm> | <calculated_level> | <criticality_level or "unknown"> |

Then add 1-2 bullets with key observations (e.g., highest criticality, biggest score gap, which entities to investigate further).`;

export const getEntityAnalyticsSkill = (ctx: EntityAnalyticsSkillsContext) =>
  defineSkillType({
    id: 'entity-analytics',
    name: 'entity-analytics',
    basePath: 'skills/security/entities',
    description: `Guide to finding and investigating security entities (hosts, users, services, generic).
      Analyze how an entity's risk score, criticality, behaviors and attributes have changed over time (e.g. last 90 days).
      Analyze how alerts contribute to an entity's risk score.
      Discover risky entities based on risk score, risk level, criticality level, watchlists, access behaviors, privilege attributes.`,
    content: `
# Entity Analysis Guide

${ctx.isEntityStoreV2Enabled ? entityStoreV2Content : legacyContent}
`,
    getInlineTools: () =>
      ctx.isEntityStoreV2Enabled
        ? []
        : FF_DYNAMICALLY_GENERATE_ESQL
        ? [getRiskScoreEsqlTool(ctx), getAssetCriticalityEsqlTool(ctx)]
        : [getRiskScoreInlineTool(ctx), getAssetCriticalityInlineTool(ctx)],
    getRegistryTools: () =>
      ctx.isEntityStoreV2Enabled
        ? [SECURITY_GET_ENTITY_TOOL_ID, SECURITY_SEARCH_ENTITIES_TOOL_ID]
        : [],
  });

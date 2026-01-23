/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_ENTITY_STORE_GET_TOOL_ID,
  SECURITY_ENTITY_STORE_SEARCH_TOOL_ID,
  SECURITY_ENTITY_STORE_SNAPSHOT_TOOL_ID,
} from '../tools';

/**
 * Entity Analysis skill for security operations.
 * This skill helps analyze security entities, investigate risk scores, and track entity changes over time.
 */
export const entityAnalysisSkill = defineSkillType({
  id: 'entity-analysis',
  name: 'entity-analysis',
  basePath: 'skills/security/entities',
  description:
    'Comprehensive guide to analyze security entities (users, hosts, services), their risk scores, behaviors, and historical changes.',
  body: `# Entity Analysis Guide

## Overview

This skill helps you analyze security entities in your environment. Entities include users, hosts, services, and generic entities. Each entity can have:
- **Risk Score**: A normalized score (0-100) indicating the entity's risk level
- **Profile Data**: Identity, attributes, behaviors, and relationships
- **Historical Snapshots**: Daily snapshots to track changes over time

## Tool Selection Decision Tree

Choose the right tool based on what you need:

### 1. Entity Risk Score Tool
Use \`entity_risk_score\` when you need:
- The current risk score for a specific entity
- Top N riskiest entities of a type (use identifier "*")
- Risk score inputs and contributing factors

**Example questions:**
- "Which users have the highest risk scores?"
- "What is John's risk score?"
- "Show me the top 10 riskiest hosts"
- "Which 10 users have the highest risk scores right now?"

**Key parameters:**
- \`identifierType\`: host, user, service, or generic
- \`identifier\`: Entity name or "*" for all entities
- \`limit\`: Number of results (default 10, max 100)

### 2. Entity Store Get Tool
Use \`entity_store_get\` when you need:
- Complete profile for a known entity
- Entity attributes (privileged, managed, MFA enabled)
- Entity behaviors (brute force victim, new country login, USB usage)
- Entity relationships (communicates with, depends on, etc.)
- Activity timeline (first seen, last activity, duration)

**Example questions:**
- "What do we know about user jsmith?"
- "Show me the profile for host server-01"
- "When was this user first seen?"
- "Is this account privileged?"
- "What systems does this user communicate with?"

**Key parameters:**
- \`entityType\`: host, user, service, or generic
- \`identifier\`: The entity name/ID

### 3. Entity Store Search Tool
Use \`entity_store_search\` when you need:
- Find entities matching specific criteria
- Filter by risk levels (Critical, High, Moderate, Low, Unknown)
- Filter by asset criticality (extreme_impact, high_impact, medium_impact, low_impact)
- Filter by attributes or behaviors
- Sort results by risk score, activity time, or name

**Example questions:**
- "What are the riskiest hosts that are high impact?"
- "Show me privileged users with high risk scores"
- "Find all entities that have been brute force victims"
- "Which service accounts have unusual access patterns?"
- "Show me users with new country logins"

**Key parameters:**
- \`entityTypes\`: Array of entity types to search
- \`riskLevels\`: Filter by risk levels
- \`assetCriticality\`: Filter by asset criticality
- \`attributes\`: Filter by privileged, managed, mfa_enabled
- \`behaviors\`: Filter by brute_force_victim, new_country_login, used_usb_device
- \`sortBy\`: risk_score, last_activity, first_seen, name
- \`limit\`: Number of results (default 10, max 100)

### 4. Entity Store Snapshot Tool
Use \`entity_store_snapshot\` when you need:
- Historical profile from a specific date
- Compare current profile with historical state
- Track risk score changes over time
- Investigate what changed for an entity

**Example questions:**
- "What did this user's profile look like on March 15th?"
- "Show me how John's risk score has changed over the last 90 days"
- "Has John Smith's risk score changed significantly?"
- "When did this entity become privileged?"
- "Show me accounts with increasing risk trends"

**Key parameters:**
- \`entityType\`: host, user, service, or generic
- \`identifier\`: The entity name/ID
- \`snapshotDate\`: Date in ISO 8601 format (YYYY-MM-DD)
- \`compareWithCurrent\`: Enable comparison with current profile (default: true)

## Best Practices

### Risk Score Interpretation
- Always use \`calculated_score_norm\` (0-100) when reporting risk scores
- Risk levels: Critical (highest), High, Moderate, Low, Unknown
- Higher scores indicate greater risk to the organization

### Entity Investigation Workflow
1. Start with risk score to assess the entity's current risk level
2. Use entity_store_get to understand the entity's profile and relationships
3. If investigating changes, use entity_store_snapshot to compare historical data
4. Use entity_store_search to find similar or related entities

### Historical Analysis
- Snapshots are created daily at midnight UTC
- When comparing over time, retrieve multiple snapshots at different dates
- The comparison feature highlights changes in risk, attributes, and behaviors

## Supported Question Patterns

| Question Pattern | Tool to Use |
|------------------|-------------|
| "Which [users/hosts] have the highest risk scores?" | entity_risk_score with identifier "*" |
| "What is [entity]'s risk score?" | entity_risk_score with specific identifier |
| "What do we know about [entity]?" | entity_store_get |
| "Show me [entity type] with [risk level] risk" | entity_store_search with riskLevels filter |
| "Find [entity type] that are [high_impact/privileged]" | entity_store_search with filters |
| "What did [entity] look like on [date]?" | entity_store_snapshot |
| "Has [entity]'s risk changed?" | entity_store_snapshot with comparison |
| "Show users logged in from multiple locations" | entity_store_search with new_country_login behavior |
| "Which accounts have unusual patterns?" | entity_store_search with behaviors filter |`,
  getAllowedTools: () => [
    SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
    SECURITY_ENTITY_STORE_GET_TOOL_ID,
    SECURITY_ENTITY_STORE_SEARCH_TOOL_ID,
    SECURITY_ENTITY_STORE_SNAPSHOT_TOOL_ID,
  ],
});

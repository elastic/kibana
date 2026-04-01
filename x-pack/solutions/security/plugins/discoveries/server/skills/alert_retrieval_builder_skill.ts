/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

import { getDefaultEsqlQueryTool } from './tools/get_default_esql_query_tool';

/**
 * Skill definition for building ES|QL queries that retrieve security alerts
 * from the `.alerts-security.alerts-<spaceId>` index for Attack Discovery.
 *
 * This skill guides the agent to construct ES|QL queries (not workflow YAML)
 * using the `generate_esql` tool with best practices for alert filtering,
 * sorting, and field selection. After generating a query, the agent calls
 * the `update_esql_query` browser API tool to update the ES|QL editor in
 * the Attack Discovery settings UI.
 */
export const alertRetrievalBuilderSkill = defineSkillType({
  basePath: 'skills/security/attack-discovery',
  content: `# Attack Discovery Alerts ES|QL Query Builder

## Purpose

Build ES|QL queries that retrieve security alerts from the \`.alerts-security.alerts-<spaceId>\`
index for Attack Discovery analysis. This skill covers both creating queries from scratch and
modifying existing queries.

## Workflow

### Building a new query from scratch

1. Call the \`security.attack-discovery.get_default_esql_query\` tool to retrieve the default
   ES|QL query. This query uses the user's space-specific anonymization settings to determine
   the correct KEEP fields, so always start here.
2. Use the \`platform.core.generate_esql\` tool to construct a valid ES|QL query. Pass the
   default query from step 1 in the \`additionalContext\` parameter as a starting point, along
   with the index \`.alerts-security.alerts-default\` (or the appropriate space-specific index)
   and a natural language description of what alerts the user wants to retrieve.
3. Use the \`platform.core.execute_esql\` tool to test the query against real data and verify
   the results look correct.
4. Call the \`update_esql_query\` browser API tool with the final query to update the ES|QL
   editor in the Attack Discovery settings UI.

### Modifying an existing query

When the user already has an ES|QL query and wants to modify it:

1. Use the \`platform.core.generate_esql\` tool, passing the existing query in the
   \`additionalContext\` parameter so the model can use it as a starting point. Describe
   the desired changes in the natural language query.
2. **Preserve the existing KEEP fields** from the user's query. The KEEP clause reflects the
   user's chosen anonymization settings. Do not replace or remove KEEP fields unless the user
   explicitly asks to change them.
3. Use the \`platform.core.execute_esql\` tool to verify the modified query returns the
   expected results.
4. Call the \`update_esql_query\` browser API tool with the updated query.

## ES|QL Best Practices for Attack Discovery Alerts

### Alert Filtering

- **Open and acknowledged alerts only**: Always filter by workflow status to exclude closed alerts:
  \`\`\`esql
  | WHERE kibana.alert.workflow_status IN ("open", "acknowledged")
  \`\`\`

- **Exclude building block alerts**: Building blocks are sub-alerts that compose higher-level
  detections and should not be included individually:
  \`\`\`esql
  | WHERE kibana.alert.building_block_type IS NULL
  \`\`\`

### Sorting

- **Sort by risk score descending** to prioritize the most critical alerts:
  \`\`\`esql
  | SORT kibana.alert.risk_score DESC, @timestamp DESC
  \`\`\`
- Secondary sort by \`@timestamp DESC\` ensures the most recent alerts appear first when risk
  scores are equal.

### Limit

- Use \`LIMIT\` to control how many alerts are retrieved:
  \`\`\`esql
  | LIMIT 100
  \`\`\`
- The default is 100 alerts. Users may adjust this based on their needs (1-10000).

### KEEP Clause

Use a \`KEEP\` clause to limit output to security-relevant ECS fields. These fields exist in the
\`.alerts-security.alerts-<spaceId>\` index and are useful for Attack Discovery analysis:

\`\`\`esql
| KEEP
    _id, @timestamp,
    agent.id,
    destination.ip,
    event.category, event.dataset, event.module, event.outcome,
    file.hash.sha256, file.name, file.path,
    host.name, host.os.name, host.os.version,
    kibana.alert.original_time, kibana.alert.risk_score,
    kibana.alert.rule.description, kibana.alert.rule.name,
    kibana.alert.rule.references,
    kibana.alert.rule.threat.framework,
    kibana.alert.rule.threat.tactic.id,
    kibana.alert.rule.threat.tactic.name,
    kibana.alert.rule.threat.tactic.reference,
    kibana.alert.rule.threat.technique.id,
    kibana.alert.rule.threat.technique.name,
    kibana.alert.rule.threat.technique.reference,
    kibana.alert.rule.threat.technique.subtechnique.id,
    kibana.alert.rule.threat.technique.subtechnique.name,
    kibana.alert.rule.threat.technique.subtechnique.reference,
    kibana.alert.severity, kibana.alert.workflow_status,
    message,
    network.protocol,
    process.args, process.command_line, process.executable,
    process.hash.sha256, process.name, process.pid,
    process.parent.command_line, process.parent.executable,
    process.parent.name,
    source.ip,
    user.domain, user.name
\`\`\`

Users may customize the KEEP fields for their specific use case, but the above set covers
the default anonymization fields relevant to Attack Discovery.

## Tools

### \`security.attack-discovery.get_default_esql_query\`

Call this tool first when building a query from scratch. It returns the default ES|QL query
with a KEEP clause derived from the user's space-specific anonymization settings, ensuring
the correct fields are included.

### \`platform.core.generate_esql\`

Use this tool to construct or modify ES|QL queries. Key parameters:
- **index**: The alert index, e.g. \`.alerts-security.alerts-default\`
- **nlQuery**: Natural language description of the desired query
- **additionalContext**: Pass an existing ES|QL query here when modifying a query so the model
  can use it as a starting point

### \`platform.core.execute_esql\`

Use this tool to test a query against real data before updating the editor. Pass the full
ES|QL query string as the \`query\` parameter.

### \`update_esql_query\` (browser API tool)

After generating or modifying a query, call this tool to update the ES|QL editor in the
Attack Discovery settings UI with the final query.

## Reference

See the referenced content for example ES|QL queries that demonstrate the best practices
described above.`,
  description:
    'Guides the agent to build ES|QL queries for retrieving security alerts from the .alerts-security.alerts-<spaceId> index for Attack Discovery analysis.',
  getInlineTools: () => [getDefaultEsqlQueryTool()],
  getRegistryTools: () => [platformCoreTools.generateEsql, platformCoreTools.executeEsql],
  id: 'attack-discovery-alert-retrieval-builder',
  name: 'attack-discovery-alerts-esql-query-builder',
  referencedContent: [
    {
      content: `# Example ES|QL Queries for Attack Discovery Alert Retrieval

## Default query

Retrieves open and acknowledged security alerts, excluding building block alerts,
sorted by risk score (highest first) and timestamp, limited to 100 results,
with a KEEP clause selecting the default Attack Discovery anonymization fields:

\`\`\`esql
FROM .alerts-security.alerts-default METADATA _id
| WHERE kibana.alert.workflow_status IN ("open", "acknowledged")
| WHERE kibana.alert.building_block_type IS NULL
| SORT kibana.alert.risk_score DESC, @timestamp DESC
| LIMIT 100
| KEEP
    _id, @timestamp,
    agent.id,
    destination.ip,
    event.category, event.dataset, event.module, event.outcome,
    file.hash.sha256, file.name, file.path,
    host.name, host.os.name, host.os.version,
    kibana.alert.original_time, kibana.alert.risk_score,
    kibana.alert.rule.description, kibana.alert.rule.name,
    kibana.alert.rule.references,
    kibana.alert.rule.threat.framework,
    kibana.alert.rule.threat.tactic.id,
    kibana.alert.rule.threat.tactic.name,
    kibana.alert.rule.threat.tactic.reference,
    kibana.alert.rule.threat.technique.id,
    kibana.alert.rule.threat.technique.name,
    kibana.alert.rule.threat.technique.reference,
    kibana.alert.rule.threat.technique.subtechnique.id,
    kibana.alert.rule.threat.technique.subtechnique.name,
    kibana.alert.rule.threat.technique.subtechnique.reference,
    kibana.alert.severity, kibana.alert.workflow_status,
    message,
    network.protocol,
    process.args, process.command_line, process.executable,
    process.hash.sha256, process.name, process.pid,
    process.parent.command_line, process.parent.executable,
    process.parent.name,
    source.ip,
    user.domain, user.name
\`\`\`

## Filtered by rule name

Retrieves alerts for a specific detection rule:

\`\`\`esql
FROM .alerts-security.alerts-default METADATA _id
| WHERE kibana.alert.workflow_status IN ("open", "acknowledged")
| WHERE kibana.alert.building_block_type IS NULL
| WHERE kibana.alert.rule.name == "Suspicious Process Execution"
| SORT kibana.alert.risk_score DESC, @timestamp DESC
| LIMIT 100
| KEEP
    _id, @timestamp,
    host.name, host.os.name,
    kibana.alert.original_time, kibana.alert.risk_score,
    kibana.alert.rule.description, kibana.alert.rule.name,
    kibana.alert.severity, kibana.alert.workflow_status,
    process.args, process.command_line, process.executable,
    process.name, process.parent.command_line, process.parent.name,
    user.domain, user.name
\`\`\`

## High severity only

Retrieves only high and critical severity alerts:

\`\`\`esql
FROM .alerts-security.alerts-default METADATA _id
| WHERE kibana.alert.workflow_status IN ("open", "acknowledged")
| WHERE kibana.alert.building_block_type IS NULL
| WHERE kibana.alert.severity IN ("high", "critical")
| SORT kibana.alert.risk_score DESC, @timestamp DESC
| LIMIT 100
| KEEP
    _id, @timestamp,
    host.name,
    kibana.alert.original_time, kibana.alert.risk_score,
    kibana.alert.rule.description, kibana.alert.rule.name,
    kibana.alert.rule.threat.tactic.name,
    kibana.alert.rule.threat.technique.name,
    kibana.alert.severity, kibana.alert.workflow_status,
    source.ip, destination.ip,
    user.name
\`\`\``,
      name: 'example-esql-queries',
      relativePath: './examples',
    },
  ],
});

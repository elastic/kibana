/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

import { getDefaultEsqlQueryTool } from '../tools/get_default_esql_query_tool';
import { RUN_ATTACK_DISCOVERY_TOOL_ID } from '../tools/run_attack_discovery_tool';

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

### Execute before you hand a query on

A query returned by \`platform.core.generate_esql\` is unverified: it can parse and still match
nothing, for example a full-text predicate on a field that does not carry the term. Before a
query leaves this skill — to the ES|QL editor via \`update_esql_query\`, or to
\`${RUN_ATTACK_DISCOVERY_TOOL_ID}\` as \`esql_query\` — run that exact query with
\`platform.core.execute_esql\` and read the row count.

- **Rows returned**: hand the query on unchanged.
- **Zero rows**: if the query matched a user-supplied term against one field the user did not
  name, rewrite that filter as described in **Matching a term the user supplies** and execute
  it once more. If it still returns zero rows, do not hand it on. Tell the user no alerts matched,
  show the query you ran, and ask whether to widen the time window or change the filter. Never call
  \`${RUN_ATTACK_DISCOVERY_TOOL_ID}\` with a query you have not executed, or with one that returned
  zero rows.
- **Error**: fix the query and execute it again before handing it on.

### Building a new query from scratch

1. Call the \`security.attack-discovery.get_default_esql_query\` tool to retrieve the default
   ES|QL query. This query uses the user's space-specific anonymization settings to determine
   the correct KEEP fields, so always start here.
2. Use the \`platform.core.generate_esql\` tool to construct a valid ES|QL query. Pass the
   default query from step 1 in the \`additionalContext\` parameter as a starting point, along
   with the index \`.alerts-security.alerts-default\` (or the appropriate space-specific index)
   and a natural language description of what alerts the user wants to retrieve.
3. Run the query with the \`platform.core.execute_esql\` tool and apply the rules in
   **Execute before you hand a query on**. This step is required, not a spot check.
4. Call the \`update_esql_query\` browser API tool with the executed query to update the ES|QL
   editor in the Attack Discovery settings UI.

### Modifying an existing query

When the user already has an ES|QL query and wants to modify it:

1. Use the \`platform.core.generate_esql\` tool, passing the existing query in the
   \`additionalContext\` parameter so the model can use it as a starting point. Describe
   the desired changes in the natural language query.
2. **Preserve the existing KEEP fields** from the user's query. The KEEP clause reflects the
   user's chosen anonymization settings. Do not replace or remove KEEP fields unless the user
   explicitly asks to change them.
3. Run the modified query with the \`platform.core.execute_esql\` tool and apply the rules in
   **Execute before you hand a query on**.
4. Call the \`update_esql_query\` browser API tool with the executed query.

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

### Matching a term the user supplies

When the user asks for alerts that carry a term (a marker, tag, campaign name, hostname fragment
or any other string) without naming the field it is in, do not guess one field. A term can sit in
\`tags\`, \`kibana.alert.workflow_tags\`, \`kibana.alert.reason\`, \`kibana.alert.rule.name\` or
\`message\`, and a filter on the wrong one parses, runs and returns zero rows. Search every field
with \`QSTR\`:

\`\`\`esql
| WHERE QSTR("<term>")
\`\`\`

Filter on a single field (\`MATCH(field, "<term>")\`, \`field == "<term>"\`) only when the user
names the field or the term is a value of a known keyword field, such as a rule name or a host
name.

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

Required before any query leaves this skill, whether it goes to the editor or to
\`${RUN_ATTACK_DISCOVERY_TOOL_ID}\`. Pass the full ES|QL query string as the \`query\` parameter.

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
  name: 'attack-discovery-alert-retrieval-builder',
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';

/**
 * AESOP prototype: read-only skill-usage explorer. Answers "how is a skill
 * actually being used?" from the Agent Builder traces so a human (or the
 * A/B workflow) can ground a variant in observed usage before writing one.
 *
 * Read-only by construction: the only tools it exposes are ES|QL execution
 * against the traces indices; it registers no write tool of any kind.
 */
export const aesopSkillExplorerSkill = defineSkillType({
  id: 'aesop-skill-explorer',
  name: 'aesop-skill-explorer',
  basePath: 'skills/security',
  description:
    'Explores Agent Builder skill-usage telemetry (traces-agent_builder.otel-*) with read-only ' +
    'ES|QL to summarize how a skill is used: invocation counts, tools called while it is loaded, ' +
    'failure rates and trace ids. Use when optimizing or auditing a skill. Read-only.',
  content: `# AESOP Skill Usage Explorer (prototype)

## When to Use This Skill

Use this skill to explore how an Agent Builder skill is actually being used, from telemetry:
- How often is a skill invoked, and is usage rising or falling?
- Which tools does the agent call while the skill is loaded?
- What do failing or low-quality interactions look like (trace ids to hand to evaluation)?
- Grounding a proposed skill variant in observed usage before A/B testing it.

## Data Source

All queries read the Agent Builder traces data streams:
\`FROM traces-agent_builder.otel-*\`

Skills are loaded per conversation round via the \`load_skill\` tool call, and spans carry no
skill attribute, so a trace is "using" a skill when a \`load_skill\` span's arguments name it:

\`\`\`esql
FROM traces-agent_builder.otel-*
| WHERE attributes.gen_ai.operation.name == "execute_tool"
  AND attributes.gen_ai.tool.name == "load_skill"
  AND TO_LOWER(attributes.gen_ai.tool.call.arguments) LIKE "*<skill-id>*"
| STATS loads = COUNT(*) BY trace_id
\`\`\`

## Read-Only

This skill only runs ES|QL queries with ${platformCoreTools.executeEsql}. It never creates,
updates or deletes anything: no rules, no cases, no saved objects, no workflow executions.
If asked to modify a skill, explain that skill changes go through the AESOP A/B workflow.

## Workflow

1. Resolve the skill id from the user's request (the skill's id, not its display name).
2. Count usage: load_skill spans matching the skill id, bucketed by day.
3. Shape usage: within matching traces, which tools are called, and how often.
4. Failures: error spans inside matching traces; collect trace ids for evaluation.
5. Summarize: counts over time, dominant tool patterns, failure rate, and the trace ids
   of representative interactions (good and bad) so a variant can be grounded in them.

## Conventions

- Always scope with \`@timestamp\` ranges (default: last 7 days) and use LIMIT.
- Report trace ids verbatim: they are the join key to evaluation scores.
- A trace that loaded the skill twice counts once (dedupe with STATS BY trace_id).
`,
});

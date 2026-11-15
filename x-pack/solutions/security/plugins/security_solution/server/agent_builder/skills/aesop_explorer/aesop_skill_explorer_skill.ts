/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { contextEngineAiIndexTools } from '@kbn/agent-builder-common/tools';

/**
 * AESOP prototype: finds skill candidates, either from security data (discovery) or from
 * Agent Builder traces of existing skills (telemetry). Read-only: every tool it uses only reads.
 */
export const aesopSkillExplorerSkill = defineSkillType({
  id: 'aesop-skill-explorer',
  name: 'aesop-skill-explorer',
  basePath: 'skills/security',
  description:
    'Finds skill candidates with read-only tools. Discovery mode searches security data for ' +
    'recurring analyst work no skill covers (new skills); telemetry mode reads Agent Builder ' +
    'traces (traces-agent_builder.otel-*) to summarize how a skill is used: invocation counts, ' +
    'tools called while it is loaded, failure rates and trace ids (variants). Read-only.',
  content: `# AESOP Skill Explorer (prototype)

## When to Use This Skill

Use this skill to find skill candidates in one of two modes:
- Discovery: what recurring analyst work in the security data has no skill covering it?
  Proposes new skills.
- Telemetry: how is an existing Agent Builder skill actually used, and where does it fail?
  Proposes variants of that skill.

Telemetry questions:
- How often is a skill invoked, and is usage rising or falling?
- Which tools does the agent call while the skill is loaded?
- What do failing or low-quality interactions look like (trace ids to hand to evaluation)?
- Grounding a proposed skill variant in observed usage before A/B testing it.

## Step 0 (both modes): read the aesop AI index first

Call ${contextEngineAiIndexTools.listAiIndices}, then ${contextEngineAiIndexTools.describeAiIndex}
and ${contextEngineAiIndexTools.queryAiIndices} on the \`aesop\` index. It holds earlier findings,
rejections and dismissals. Never re-propose a candidate that was rejected or dismissed; build on
findings that were accepted.

## Discovery Mode

Look in the security data, not in traces:
1. ${platformCoreTools.listIndices} and ${platformCoreTools.indexExplorer} to find the relevant
   security indices (alerts, cases, endpoint and rule data).
2. ${platformCoreTools.getIndexMapping} to learn the fields before querying.
3. ${platformCoreTools.search} or ${platformCoreTools.executeEsql} to find recurring patterns:
   repeated alert types, frequent case themes, steps analysts repeat by hand.
4. For each pattern, check the \`aesop\` AI index from Step 0 and any skill list given in the
   request: a candidate is only new if no earlier finding or listed skill covers it. You cannot
   list skills yourself, so do not claim a skill is missing beyond those sources.
5. Report the document ids and counts that evidence each candidate, verbatim.

## Telemetry Mode

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

This skill only reads: ES|QL, search, index discovery and AI-index queries. It never creates,
updates or deletes anything: no rules, no cases, no saved objects, no workflow executions.
If asked to modify a skill, explain that skill changes go through the AESOP A/B workflow.

## Telemetry Workflow

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

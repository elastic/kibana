/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import {
  RUM_ANALYST_AGENT_TYPE_ID,
  RUM_ANALYST_SKILL_IDS,
  RUM_UX_TOOL_IDS,
} from '../../common/rum_agent';

export const rumAnalystToolSelection = [
  {
    tool_ids: [
      RUM_UX_TOOL_IDS.getOverview,
      RUM_UX_TOOL_IDS.findSessions,
      RUM_UX_TOOL_IDS.getErrors,
      RUM_UX_TOOL_IDS.getPages,
      RUM_UX_TOOL_IDS.getReport,
      platformCoreTools.executeEsql,
    ],
  },
];

export const RUM_ANALYST_INSTRUCTIONS = `You are the RUM Analyst for Elastic User Experience. You investigate real-user performance, errors, and frustration, and you write stakeholder-ready reports.

How to work:
- Always call tools for numbers. Never invent KPIs, session IDs, pages, or users.
- Honor the user's time range and filters. Default to the last 24 hours when none are given.
- Prefer compact findings: headline, 3–6 bullets, then next steps with session IDs the user can open in Session Replay.
- Do not echo emails or other PII unless the user asked for identified users.

Playbooks:
- Slow users: ${RUM_UX_TOOL_IDS.findSessions} with sortField=durationMs, sortDirection=desc. Summarize who, which pages, geo, and whether errors/rage are involved.
- Where the site is slow: ${RUM_UX_TOOL_IDS.getPages} plus ${RUM_UX_TOOL_IDS.getOverview} countries. Rank by poor LCP weighted by views.
- Who is facing errors: ${RUM_UX_TOOL_IDS.getErrors} then ${RUM_UX_TOOL_IDS.findSessions} with hasErrors=true.
- Frustration: overview frustration counts, then ${RUM_UX_TOOL_IDS.findSessions} with hasRage=true.
- Reporting / week-over-week: ${RUM_UX_TOOL_IDS.getReport} with the matching templateId (scorecard for a full brief) and compare=previous.

You may use ${platformCoreTools.executeEsql} only when the dedicated RUM tools cannot answer the question.`;

export const rumAnalystAgentType = {
  id: RUM_ANALYST_AGENT_TYPE_ID,
  name: 'RUM Analyst',
  description:
    'Investigates real-user performance, errors, frustration, and writes UX reports from RUM data.',
  avatar_icon: 'map',
  baseConfiguration: {
    instructions: RUM_ANALYST_INSTRUCTIONS,
    enable_elastic_capabilities: false,
    connector_ids: [],
    skill_ids: [...RUM_ANALYST_SKILL_IDS],
    tools: rumAnalystToolSelection,
  },
} as const satisfies AgentTypeDefinition;

export const registerRumAnalystAgentType = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.agents.registerType(rumAnalystAgentType);
};

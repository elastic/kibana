/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode, type AgentCreateRequest } from '@kbn/agent-builder-common';

import {
  PND_INCIDENT_AGENT_ID,
  PND_INVESTIGATION_AGENT_ID,
  PND_TUNING_AGENT_ID,
} from '../../../common/constants';

/**
 * `security.run_rule_preview` — "runs a security detection rule preview over a time range without
 * saving the rule, then stores the result as a rule preview attachment". That is the backtest a
 * tuning proposal was meant to carry (plan A8), and it is **deliberately not selected here.**
 *
 * The plan assumed the tool was "already registered, so wiring it is close to free". It is not: it is
 * registered **only** behind `experimentalFeatures.rulePreviewAttachmentEnabled`, which defaults to
 * **false**. Verified live on a default stack — creating an agent that selects it fails with
 * `400 Agent tool selection validation failed: Tool id 'security.run_rule_preview' does not exist.`
 *
 * Selecting it anyway would have shipped a real defect rather than a harmless no-op. `agents.ensure()`
 * does **not** validate tool selections (the system client writes the document directly, unlike
 * `AgentClientImpl.create`/`.update`), so installation would succeed and execution would degrade
 * cleanly — tool selection is an intersection with the caller's available tools
 * (`filterToolsBySelection`), so an unregistered id resolves to nothing rather than an error. But the
 * agent would then be **un-editable**: these agents are system-installed and *user-editable*, and
 * every update goes through the validation above, so any later edit of the Watch Detection Engineer
 * would 400 until an analyst noticed and removed a tool they never added.
 *
 * So this takes the plan's own named fallback, on verified evidence: no tool, and the tuning card
 * renders an explicit "no backtest available" (never a blank). `draft_tuning`'s prompt already tells
 * the agent to omit `preview` rather than estimate one, and `preview` is optional in the schema, so
 * nothing else changes.
 *
 * **To turn the backtest on** once `rulePreviewAttachmentEnabled` is set: add
 * `tools: [{ tool_ids: ['security.run_rule_preview'] }]` to the tuning agent below — and delete the
 * already-installed agent from the target space first, because `ensure` never overwrites an existing
 * one.
 */
const NO_TOOLS = [{ tool_ids: [] }];

/**
 * The three per-phase PND agents, installed per space by
 * {@link import('../install_pnd_agents').createPndAgentInstaller}.
 *
 * Three properties of these definitions are load-bearing:
 *
 * 1. **`type` is omitted**, so each agent defaults to the chat type. That is what keeps A2 inside
 *    the epic's "no CODEOWNERS changes, no Agent Builder source edits" constraint — a managed agent
 *    type would need an `AGENT_BUILDER_AGENT_TYPES` allow-list entry.
 * 2. **`access_mode: Public`**, matching the orchestrators' `public-conversation: true`.
 *    `conversations.list()` intersects on the agent ids the caller can access, so a private agent
 *    would silently shrink the chats view for any analyst who cannot "use" it.
 * 3. **`alert-analysis`, never `alert-triage`.** `alert-triage` ranks the whole alert queue
 *    "without investigating individual alerts"; `alert-analysis` is defined for "triaging a
 *    specific security alert to determine if it is a true or false positive" and corroborates
 *    against live data — fetch the alert, correlate co-occurring alerts by shared host/user/IP,
 *    enrich with Elastic Security Labs threat intel, assess entity risk. That difference is what
 *    makes the Watch Floor's `isIncident` verdict worth reading instead of a paraphrase of the
 *    markdown the agent was already handed. It also means the verdict is only as good as the
 *    space's data: in a space with no alerts these skills degrade to re-reading the AD markdown.
 *
 * **`instructions` name no programme.** Each agent says what it is, not which programme installed it
 * (kibana-phf4.16). The names surface in the Agent Builder picker, and a product name there tells
 * an analyst nothing they cannot see from the app they are already in.
 *
 * ⚠️ Editing an `instructions` string does **not** reach a space that already has the agent:
 * `ensure` never overwrites an existing one, so delete the agent from the target space first (the
 * same caveat as the tool note above).
 *
 * Skill registration, verified in `security_solution`'s `register_skills.ts`: `alert-analysis`,
 * `threat-hunting`, `entity-analytics` and `detection-rule-edit` are unconditional;
 * `find-security-rules` is behind `dexAiSkillFindRules` (default **true**); `investigate-rule` is
 * behind `investigateRuleSkill` (default **false**). An unresolvable or invisible skill id is
 * dropped silently by `bulkGet`, never raised, so listing it costs nothing on a stack where the
 * flag is off and it starts working the moment the flag is on.
 */
export const PND_AGENTS: readonly AgentCreateRequest[] = [
  {
    access_control: { access_mode: AgentAccessControlMode.Public },
    avatar_symbol: 'WI',
    configuration: {
      instructions:
        'You are the Watch Investigator. Given an Attack Discovery, scope ' +
        'the attack, corroborate or refute it against the data in this space, and decide whether it ' +
        'warrants escalation to an incident. Investigate the specific discovery you were given — do ' +
        'not rank or re-prioritise the wider alert queue. Ground every claim in evidence you ' +
        'actually retrieved, and say plainly when the data does not support a conclusion.',
      skill_ids: ['alert-analysis', 'entity-analytics', 'threat-hunting'],
      tools: NO_TOOLS,
    },
    description:
      'Scopes an Attack Discovery, corroborates or refutes it against live alert, entity and threat-intel data, and decides whether it warrants escalation to an incident.',
    id: PND_INVESTIGATION_AGENT_ID,
    labels: ['security', 'pnd', 'watch', 'investigation'],
    name: 'Watch Investigator',
  },
  {
    access_control: { access_mode: AgentAccessControlMode.Public },
    avatar_symbol: 'WR',
    configuration: {
      instructions:
        'You are the Watch Incident Responder. Given an escalated ' +
        'investigation, stage the containment and response actions the incident calls for and ' +
        'explain what each one would change. Never execute them: a human approval gate authorises ' +
        'every consequential action, and your job is to make that decision an informed one.',
      skill_ids: ['alert-analysis', 'entity-analytics'],
      tools: NO_TOOLS,
    },
    description:
      'Stages containment and response actions for an escalated incident and explains their impact, so a human approval gate can authorise them.',
    id: PND_INCIDENT_AGENT_ID,
    labels: ['security', 'pnd', 'watch', 'incident'],
    name: 'Watch Incident Responder',
  },
  {
    access_control: { access_mode: AgentAccessControlMode.Public },
    avatar_symbol: 'WD',
    configuration: {
      instructions:
        'You are the Watch Detection Engineer. Close the missed detection: ' +
        'map the attacker actions that went uncaught to the coverage gap that let them through, then ' +
        'draft exactly one detection-rule change. Restrict the change to the fields a reviewer can ' +
        'judge and reverse: enabling or disabling the rule, its investigation guide, its highlighted ' +
        'investigation fields, or its query. A query change is backtested against real data and the ' +
        'before and after alert counts are shown beside the diff, so propose one only on a rule ' +
        'whose type is query. Never propose an alert suppression or threshold change: those alter ' +
        'how alerts group rather than which documents match, so a backtest cannot describe what the ' +
        'change did. State plainly when you cannot measure the effect of the change rather than ' +
        'estimating it.',
      skill_ids: ['detection-rule-edit', 'find-security-rules', 'investigate-rule'],
      tools: NO_TOOLS,
    },
    description:
      'Maps uncaught attacker actions to a detection coverage gap and drafts one reviewable, reversible rule change.',
    id: PND_TUNING_AGENT_ID,
    labels: ['security', 'pnd', 'watch', 'detection-tuning'],
    name: 'Watch Detection Engineer',
  },
];

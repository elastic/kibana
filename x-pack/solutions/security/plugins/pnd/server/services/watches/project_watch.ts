/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowListItemDto, WorkflowYaml } from '@kbn/workflows';
import type {
  AutonomyLevel,
  ScheduleCadence,
  ScheduleHandoff,
  ScheduleMode,
  ScopeAccess,
  Watch,
  WatchCallableRef,
  WatchRecentRun,
  WatchSchedule,
  WatchScope,
  WatchTriggerProjection,
  WorkflowTriggerType,
} from '@kbn/pnd-common';
import { coverageFromSchedule } from '@kbn/pnd-common';
import type { AgentLookup } from './types';

/** Static watch policy bag from `consts.watch_policy`. */
interface WatchPolicyAttrs {
  mandate?: string;
  autonomyLevel?: AutonomyLevel;
  handoff?: ScheduleHandoff;
  scopes?: WatchScope[];
  onDemand?: boolean;
  draft?: boolean;
  from?: number;
  to?: number;
  mode?: ScheduleMode;
  cadence?: ScheduleCadence;
  every?: number;
  scopeSummary?: string;
  ui?: {
    color?: string;
    icon?: string;
    order?: number;
  };
  callables?: WatchCallableRef[];
}

const DEFAULT_COLOR = '#6b7280';
const DEFAULT_ICON = 'email';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const asAutonomyLevel = (value: unknown): AutonomyLevel => {
  const n = asNumber(value, 1);
  if (n >= 1 && n <= 5) return n as AutonomyLevel;
  return 1;
};

const asScopeAccess = (value: unknown): ScopeAccess => {
  if (value === 'full' || value === 'masked' || value === 'denied') return value;
  return 'full';
};

const asHandoff = (value: unknown): ScheduleHandoff => {
  if (
    value === 'officer' ||
    value === 'oncall' ||
    value === 'brief' ||
    value === 'records' ||
    value === 'none'
  ) {
    return value;
  }
  return 'none';
};

const asMode = (value: unknown): ScheduleMode => {
  if (value === 'always' || value === 'window' || value === 'demand') return value;
  return 'demand';
};

export const extractWatchPolicy = (
  definition: WorkflowYaml | null | undefined
): WatchPolicyAttrs | undefined => {
  const policy = definition?.consts?.watch_policy;
  if (!isRecord(policy)) return undefined;
  return policy as unknown as WatchPolicyAttrs;
};

export const normalizeWorkflowTriggerType = (raw: string | undefined): WorkflowTriggerType => {
  if (raw === 'scheduled' || raw === 'schedule') return 'schedule';
  if (!raw || raw === 'manual') return 'manual';
  return 'event';
};

export const projectTriggers = (
  definition: WorkflowYaml | null | undefined
): WatchTriggerProjection[] => {
  const triggers = definition?.triggers ?? [];
  return triggers.map((trigger) => {
    const type = normalizeWorkflowTriggerType(trigger.type);
    const triggerRecord = trigger as Record<string, unknown>;
    const withBlock = isRecord(triggerRecord.with) ? triggerRecord.with : {};
    let summary = String(trigger.type ?? 'manual');
    if (type === 'schedule' && typeof withBlock.every === 'string') {
      summary = `Schedule · every ${withBlock.every}`;
    } else if (type === 'event') {
      summary = 'On alert';
    } else if (type === 'manual') {
      summary = 'Manual / on demand';
    }
    return { type, summary };
  });
};

export const projectSchedule = (
  triggers: WatchTriggerProjection[],
  policy: WatchPolicyAttrs | undefined
): WatchSchedule => {
  const hasSchedule = triggers.some((t) => t.type === 'schedule');
  const hasEvent = triggers.some((t) => t.type === 'event');
  const hasManual = triggers.some((t) => t.type === 'manual');
  const manualOnly = hasManual && !hasSchedule && !hasEvent;
  const onDemand = manualOnly || (policy?.onDemand ?? false);

  let mode: ScheduleMode = 'demand';
  if (hasSchedule) {
    mode = policy?.mode ? asMode(policy.mode) : 'window';
  } else if (hasEvent) {
    mode = 'always';
  }

  const set = !asBoolean(policy?.draft, false) && mode !== 'demand';

  return {
    set,
    mode,
    from: asNumber(policy?.from, 8),
    to: asNumber(policy?.to, 18),
    onDemand,
    cadence: hasSchedule ? 'sweep' : hasEvent ? 'stream' : 'manual',
    every: asNumber(policy?.every, 60),
    handoff: asHandoff(policy?.handoff),
  };
};

const projectScopes = (policy: WatchPolicyAttrs | undefined): WatchScope[] => {
  if (!policy?.scopes || !Array.isArray(policy.scopes)) return [];
  return policy.scopes.map((scope) => ({
    name: asString(scope.name, 'Scope'),
    access: asScopeAccess(scope.access),
    label: asString(scope.label, 'Read'),
  }));
};

const SKILL_URI_RE = /skill:\/\/([a-zA-Z0-9._-]+)/g;

const humanizeId = (id: string): string =>
  id
    .split(/[-_.]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const walkSteps = (steps: unknown, visit: (step: Record<string, unknown>) => void): void => {
  if (!Array.isArray(steps)) return;
  for (const step of steps) {
    if (!isRecord(step)) continue;
    visit(step);
    walkSteps(step.steps, visit);
    walkSteps(step.else, visit);
    if (Array.isArray(step.cases)) {
      for (const branchCase of step.cases) {
        if (isRecord(branchCase)) {
          walkSteps(branchCase.steps, visit);
        }
      }
    }
    if (Array.isArray(step.branches)) {
      for (const branch of step.branches) {
        if (isRecord(branch)) {
          walkSteps(branch.steps, visit);
        }
      }
    }
  }
};

const collectSkillIdsFromText = (text: string, into: Set<string>): void => {
  SKILL_URI_RE.lastIndex = 0;
  let match = SKILL_URI_RE.exec(text);
  while (match) {
    into.add(match[1]);
    match = SKILL_URI_RE.exec(text);
  }
};

/**
 * Derive executable capabilities from the workflow graph.
 * Policy `callables` are display overrides only (name/summary/gated/enabled).
 */
export const projectCallablesFromDefinition = (
  definition: WorkflowYaml | null | undefined,
  policy: WatchPolicyAttrs | undefined,
  agents?: AgentLookup
): WatchCallableRef[] => {
  const skillIds = new Set<string>();
  const workflowIds = new Set<string>();

  walkSteps(definition?.steps, (step) => {
    const type = asString(step.type);
    if (type === 'ai.agent') {
      const withBlock = isRecord(step.with) ? step.with : {};
      const agentId = asString(step['agent-id']);

      if (agentId && agents) {
        const agentDef = agents.getAgent(agentId);
        if (agentDef) {
          const agentTypeDef = agentDef.type ? agents.getAgentType(agentDef.type) : undefined;
          const baseSkills: readonly string[] = agentTypeDef?.baseConfiguration?.skill_ids ?? [];
          const overridesBlock = isRecord(withBlock.configuration_overrides)
            ? withBlock.configuration_overrides
            : {};
          const stepSkillIds = Array.isArray(overridesBlock.skill_ids)
            ? overridesBlock.skill_ids.filter((s): s is string => typeof s === 'string')
            : null;
          const agentSkills: readonly string[] = agentDef.configuration.skill_ids ?? [];
          for (const id of [...baseSkills, ...(stepSkillIds ?? agentSkills)]) {
            if (id) skillIds.add(id);
          }
          return;
        }
      }

      // No agent lookup or agent not found — fall back to URI scanning.
      const message = asString(withBlock.message);
      if (message) collectSkillIdsFromText(message, skillIds);
      collectSkillIdsFromText(JSON.stringify(withBlock), skillIds);
    }
    if (type === 'workflow.execute' || type === 'workflow.executeAsync') {
      const withBlock = isRecord(step.with) ? step.with : {};
      const workflowId =
        asString(withBlock['workflow-id']) ||
        asString(withBlock.workflowId) ||
        asString(withBlock.workflow_id);
      if (workflowId) workflowIds.add(workflowId);
    }
  });

  const overrides = new Map<string, WatchCallableRef>();
  for (const c of policy?.callables ?? []) {
    const id = asString(c.id);
    if (!id) continue;

    overrides.set(id, {
      id,
      name: asString(c.name, id),
      kind: c.kind === 'workflow' ? 'workflow' : 'skill',
      summary: asString(c.summary, ''),
      gated: asBoolean(c.gated, false),
      // This is reading from the "callables" constant on the workflow but
      // if we add the ability to enable/disable, we'll have to read that state
      // from persistence
      enabled: asBoolean(c.enabled, true),

      // What does this mean for a skill? We're projecting the list of skills bound
      // to the workflow but not all skills are used in every ai.agent step even if
      // they are available. Do we have this information now (which skills are called
      // for an ai.agent) or is this something we'll be able to get from the investigation/
      // conversation trail?
      lastRun: typeof c.lastRun === 'string' ? c.lastRun : null,
    });
  }

  const callables: WatchCallableRef[] = [];

  for (const id of skillIds) {
    const override = overrides.get(id);
    const skillDef = agents?.getSkill(id);
    callables.push({
      id,
      name: skillDef?.name ?? override?.name ?? humanizeId(id),
      kind: 'skill',
      summary: skillDef?.description ?? override?.summary ?? '',
      gated: override?.gated ?? false,
      enabled: override?.enabled ?? true,
      lastRun: override?.lastRun ?? null,
    });
  }

  for (const id of workflowIds) {
    const override = overrides.get(id);
    callables.push({
      id,
      name: override?.name ?? humanizeId(id.replace(/^system-/, '')),
      kind: 'workflow',
      summary: override?.summary ?? 'Nested workflow',
      gated: override?.gated ?? false,
      enabled: override?.enabled ?? true,
      lastRun: override?.lastRun ?? null,
    });
  }

  return callables;
};

export const projectRecentRunsFromHistory = (
  history: WorkflowListItemDto['history']
): WatchRecentRun[] => {
  if (!history?.length) return [];
  return history.slice(0, 10).map((run) => ({
    executionId: run.id,
    startedAt: run.startedAt,
    status: String(run.status),
    steps: [],
    summary: `${run.status}${run.duration != null ? ` · ${Math.round(run.duration / 1000)}s` : ''}`,
  }));
};

export const projectWorkflowToWatch = (item: WorkflowListItemDto, agents?: AgentLookup): Watch => {
  const definition = item.definition;
  const policy = extractWatchPolicy(definition);
  const triggers = projectTriggers(definition);
  const schedule = projectSchedule(triggers, policy);
  const coverage = coverageFromSchedule(schedule);
  const recentRuns = projectRecentRunsFromHistory(item.history);
  const lastRun = recentRuns[0]?.startedAt ?? null;
  // List DTOs often omit top-level `tags`; fall back to definition.tags.
  const tags = item.tags?.length ? item.tags : definition?.tags ?? [];
  const sortOrder = asNumber(policy?.ui?.order, Number.MAX_SAFE_INTEGER);

  return {
    id: item.id,
    name: item.name,
    tags,
    color: asString(policy?.ui?.color, DEFAULT_COLOR),
    icon: asString(policy?.ui?.icon, DEFAULT_ICON),
    enabled: item.enabled,
    draft: asBoolean(policy?.draft, !item.enabled),
    managed: item.managed === true,
    sortOrder,
    mandate: asString(policy?.mandate, item.description || 'Watch'),
    description: item.description || '',
    schedule,
    triggers,
    coverage,
    scopeSummary: asString(policy?.scopeSummary, '—'),
    scopes: projectScopes(policy),
    callables: projectCallablesFromDefinition(definition, policy, agents),
    autonomyLevel: asAutonomyLevel(policy?.autonomyLevel),
    metrics: {
      // Real 7-day run counts are not available from the list/history projection yet.
      runs7d: null,
      acceptedPct: null,
      timeSaved: null,
      lastRun,
    },
    recentRuns,
  };
};

export const buildCustomWatchYaml = (name: string, description: string): string => `version: "1"
name: ${JSON.stringify(name)}
description: ${JSON.stringify(description)}
enabled: true
tags:
  - watch
  - watch-custom
triggers:
  - type: manual
consts:
  watch_policy:
    mandate: ${JSON.stringify(name)}
    autonomyLevel: 1
    handoff: none
    onDemand: true
    draft: false
    cadence: manual
    mode: demand
    ui:
      color: "#6b7280"
      icon: sparkles
    scopeSummary: Custom
    scopes: []
    callables: []
steps:
  - name: run_watch
    type: console
    with:
      message: "Custom watch skeleton — add agent skills next"
`;

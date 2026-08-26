/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowListItemDto, WorkflowYaml } from '@kbn/workflows';
import type {
  Watch,
  WatchCallableRef,
  WatchRecentRun,
  WatchSchedule,
  WatchTriggerProjection,
  WorkflowTriggerType,
} from '@kbn/pnd-common';
import { coverageFromSchedule } from '@kbn/pnd-common';
import type { AgentLookup } from '../utils';

/** Static watch policy bag from `consts.watch_policy`. */
interface WatchPolicyAttrs {
  mandate?: string;
  ui?: {
    color?: string;
    order?: number;
  };
  callables?: WatchCallableRef[];
}

const DEFAULT_COLOR = '#6b7280';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

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

export const projectSchedule = (triggers: WatchTriggerProjection[]): WatchSchedule => {
  const hasSchedule = triggers.some((t) => t.type === 'schedule');
  const hasEvent = triggers.some((t) => t.type === 'event');
  const hasManual = triggers.some((t) => t.type === 'manual');
  const set = hasSchedule || hasEvent;

  return {
    set,
    mode: set ? 'always' : 'demand',
    from: 0,
    to: 23,
    onDemand: hasManual,
    cadence: hasSchedule ? 'sweep' : hasEvent ? 'stream' : 'manual',
    every: 60,
    handoff: 'none',
  };
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

export const projectSkillsFromDefinition = (
  definition: WorkflowYaml | null | undefined,
  policy: WatchPolicyAttrs | undefined,
  agents?: AgentLookup
): WatchCallableRef[] => {
  const skillIds = new Set<string>();

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

      const message = asString(withBlock.message);
      if (message) collectSkillIdsFromText(message, skillIds);
      collectSkillIdsFromText(JSON.stringify(withBlock), skillIds);
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
      lastRun: typeof c.lastRun === 'string' ? c.lastRun : null,
    });
  }

  const skills: WatchCallableRef[] = [];

  for (const id of skillIds) {
    const override = overrides.get(id);
    // Default to skill definition only if UI overrides are not defined
    const skillDef = override ? undefined : agents?.getSkill(id);
    skills.push({
      id,
      name: override?.name ?? skillDef?.name ?? humanizeId(id),
      kind: 'skill',
      summary: override?.summary ?? skillDef?.description ?? 'Invoked via ai.agent',
      lastRun: override?.lastRun ?? null,
    });
  }

  return skills;
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
  const schedule = projectSchedule(triggers);
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
    enabled: item.enabled,
    draft: false,
    managed: item.managed === true,
    sortOrder,
    mandate: asString(policy?.mandate, item.description || 'Watch'),
    description: item.description || '',
    schedule,
    triggers,
    coverage,
    scopeSummary: '',
    scopes: [],
    skills: projectSkillsFromDefinition(definition, policy, agents),
    metrics: {
      lastRun,
    },
    recentRuns,
  };
};

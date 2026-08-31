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

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

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

/**
 * Derive executable capabilities from the workflow graph.
 * Policy `callables` are display overrides only (name/summary/gated/enabled).
 */
export const projectCallablesFromDefinition = (
  definition: WorkflowYaml | null | undefined,
  policy: WatchPolicyAttrs | undefined
): WatchCallableRef[] => {
  const skillIds = new Set<string>();
  const workflowIds = new Set<string>();

  walkSteps(definition?.steps, (step) => {
    const type = asString(step.type);
    if (type === 'ai.agent') {
      const withBlock = isRecord(step.with) ? step.with : {};
      const message = asString(withBlock.message);
      if (message) collectSkillIdsFromText(message, skillIds);
      // Also scan the whole with-block for skill URIs in other string fields.
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
      enabled: asBoolean(c.enabled, true),
      lastRun: typeof c.lastRun === 'string' ? c.lastRun : null,
    });
  }

  const callables: WatchCallableRef[] = [];

  for (const id of skillIds) {
    const override = overrides.get(id);
    callables.push({
      id,
      name: override?.name ?? humanizeId(id),
      kind: 'skill',
      summary: override?.summary ?? 'Invoked via ai.agent',
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

export const projectWorkflowToWatch = (item: WorkflowListItemDto): Watch => {
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
    callables: projectCallablesFromDefinition(definition, policy),
    metrics: {
      lastRun,
    },
    recentRuns,
  };
};

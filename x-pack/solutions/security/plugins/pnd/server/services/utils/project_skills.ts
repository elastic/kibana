/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WatchCallableRef } from '@kbn/pnd-common';
import type { WorkflowYaml } from '@kbn/workflows';
import { isRecord } from '@kbn/workflows-management-plugin/common/lib/type_guards';
import type { AgentLookup } from './build_agent_lookup';

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const humanizeId = (id: string): string =>
  id
    .split(/[-_.]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const SKILL_URI_RE = /skill:\/\/([a-zA-Z0-9._-]+)/g;

const collectSkillIdsFromText = (text: string, into: Set<string>): void => {
  SKILL_URI_RE.lastIndex = 0;
  let match = SKILL_URI_RE.exec(text);
  while (match) {
    into.add(match[1]);
    match = SKILL_URI_RE.exec(text);
  }
};

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

export const projectSkillsFromDefinition = (
  definition: WorkflowYaml | null | undefined,
  agentLookupCallback?: AgentLookup
): WatchCallableRef[] => {
  const skillIds = new Set<string>();

  walkSteps(definition?.steps, (step) => {
    const type = asString(step.type);
    if (type === 'ai.agent') {
      const withBlock = isRecord(step.with) ? step.with : {};
      const agentId = asString(step['agent-id']);

      // Parse configuration_overrides.skill_ids unconditionally so they survive
      // when the agent lookup is unavailable or the agent-id cannot be resolved.
      const overridesBlock = isRecord(withBlock.configuration_overrides)
        ? withBlock.configuration_overrides
        : {};
      const overrideSkillIds = Array.isArray(overridesBlock.skill_ids)
        ? overridesBlock.skill_ids.filter((s): s is string => typeof s === 'string')
        : null;

      if (agentId && agentLookupCallback) {
        const agentDef = agentLookupCallback.getAgent(agentId);
        if (agentDef) {
          const agentTypeDef = agentDef.type
            ? agentLookupCallback.getAgentType(agentDef.type)
            : undefined;
          const baseSkills: readonly string[] = agentTypeDef?.baseConfiguration?.skill_ids ?? [];
          // When the step has no overrides, fall back to the agent's own skill list.
          const agentSkills: readonly string[] =
            overrideSkillIds === null ? agentDef.configuration.skill_ids ?? [] : [];
          for (const id of [...baseSkills, ...(overrideSkillIds ?? agentSkills)]) {
            if (id) skillIds.add(id);
          }
          return;
        }
      }

      // No lookup or unresolved agent: use structured overrides when present so
      // skills are not lost. Fall back to URI scanning only when no overrides exist.
      if (overrideSkillIds !== null) {
        for (const id of overrideSkillIds) {
          if (id) skillIds.add(id);
        }
      } else {
        const message = asString(withBlock.message);
        if (message) collectSkillIdsFromText(message, skillIds);
        collectSkillIdsFromText(JSON.stringify(withBlock), skillIds);
      }
    }
  });

  const skills: WatchCallableRef[] = [];

  for (const id of skillIds) {
    // Default to skill definition
    const skillDef = agentLookupCallback?.getSkill(id);
    skills.push({
      id,
      name: skillDef?.name ?? humanizeId(id),
      kind: 'skill',
      summary: skillDef?.description ?? 'Invoked via ai.agent',
      lastRun: null,
    });
  }

  return skills;
};

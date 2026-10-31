/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { RUM_ANALYST_SKILL_IDS, RUM_UX_TOOL_IDS } from '../../../common/rum_agent';
import { registerRumSkills } from './register_skills';

describe('registerRumSkills', () => {
  it('registers the five RUM playbook skills with their tools', async () => {
    const registered: SkillDefinition[] = [];
    registerRumSkills({
      skills: {
        register: (skill: SkillDefinition) => {
          registered.push(skill);
        },
      },
    } as unknown as Parameters<typeof registerRumSkills>[0]);

    expect(registered.map((skill) => skill.id)).toEqual([...RUM_ANALYST_SKILL_IDS]);
    expect(registered.every((skill) => skill.excludeFromElasticCapabilities)).toBe(true);

    const toolsBySkill = await Promise.all(
      registered.map(async (skill) => ({
        id: skill.id,
        tools: await skill.getRegistryTools?.(),
      }))
    );

    expect(toolsBySkill).toEqual([
      {
        id: RUM_ANALYST_SKILL_IDS[0],
        tools: [RUM_UX_TOOL_IDS.findSessions, RUM_UX_TOOL_IDS.getOverview],
      },
      {
        id: RUM_ANALYST_SKILL_IDS[1],
        tools: [RUM_UX_TOOL_IDS.getPages, RUM_UX_TOOL_IDS.getOverview],
      },
      {
        id: RUM_ANALYST_SKILL_IDS[2],
        tools: [RUM_UX_TOOL_IDS.getErrors, RUM_UX_TOOL_IDS.findSessions],
      },
      {
        id: RUM_ANALYST_SKILL_IDS[3],
        tools: [RUM_UX_TOOL_IDS.getOverview, RUM_UX_TOOL_IDS.findSessions],
      },
      {
        id: RUM_ANALYST_SKILL_IDS[4],
        tools: [RUM_UX_TOOL_IDS.getReport],
      },
    ]);
  });
});

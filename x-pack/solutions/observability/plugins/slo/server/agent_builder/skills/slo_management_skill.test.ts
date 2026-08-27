/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSkillDefinition } from '@kbn/agent-builder-server/skills';
import { SLO_AGENT_TOOL_IDS, SLO_MANAGEMENT_SKILL_ID } from '@kbn/slo-schema';
import type { SloToolDeps } from '../common/deps';
import { createSloManagementSkill } from './slo_management_skill';

const createDeps = (): SloToolDeps => ({
  getScopedClients: jest.fn(),
  getLicensing: jest.fn(),
  config: { isServerless: false, getIsCpsEnabled: () => false },
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
});

describe('createSloManagementSkill', () => {
  it('creates the skill without throwing', () => {
    expect(() => createSloManagementSkill(createDeps())).not.toThrow();
  });

  it('registers under the stable slo-management id', () => {
    const skill = createSloManagementSkill(createDeps());
    expect(skill.id).toBe(SLO_MANAGEMENT_SKILL_ID);
  });

  it('uses dot-free name slo-management', () => {
    const skill = createSloManagementSkill(createDeps());
    expect(skill.name).toBe('slo-management');
    expect(skill.name).not.toContain('.');
  });

  it('has the correct basePath', () => {
    const skill = createSloManagementSkill(createDeps());
    expect(skill.basePath).toBe('skills/observability');
  });

  it('is marked experimental', () => {
    const skill = createSloManagementSkill(createDeps());
    expect(skill.experimental).toBe(true);
  });

  it('has no uiSettingRequired', () => {
    const skill = createSloManagementSkill(createDeps());
    expect(skill.uiSettingRequired).toBeUndefined();
  });

  it('exposes only list_slos as an inline tool', async () => {
    const skill = createSloManagementSkill(createDeps());
    const inlineTools = (await skill.getInlineTools?.()) ?? [];
    const inlineToolIds = inlineTools.map((tool) => tool.id);
    expect(inlineToolIds).toEqual([SLO_AGENT_TOOL_IDS.listSlos]);
  });

  it('passes schema validation (description length, name regex, inline tools cap)', async () => {
    const skill = createSloManagementSkill(createDeps());
    await expect(validateSkillDefinition(skill)).resolves.toEqual(skill);
  });
});

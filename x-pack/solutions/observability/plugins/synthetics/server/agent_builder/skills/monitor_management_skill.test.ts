/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { MONITOR_MANAGEMENT_SKILL_ID, syntheticsTools } from '../common/constants';
import { createMonitorManagementSkill } from './monitor_management_skill';

describe('createMonitorManagementSkill', () => {
  const skill = createMonitorManagementSkill();

  it('uses the namespaced skill id from constants', () => {
    expect(skill.id).toBe(MONITOR_MANAGEMENT_SKILL_ID);
    expect(skill.id).toBe('observability.synthetics.monitor-management');
  });

  it('exposes a skill name that satisfies the registry regex (no dots)', () => {
    expect(skill.name).toBe('monitor-management');
    expect(skill.name).toMatch(/^[a-z0-9-_]+$/);
  });

  it('uses the flat observability basePath like other o11y skills', () => {
    expect(skill.basePath).toBe('skills/observability');
  });

  it('declares a single inline tool — manage_monitor', async () => {
    const inlineTools = (await skill.getInlineTools?.()) ?? [];
    expect(inlineTools).toHaveLength(1);
    expect(inlineTools[0].id).toBe(syntheticsTools.manageMonitor);
  });

  it('mentions the tool id and HTTP-only scope in the content so the LLM finds them', () => {
    expect(skill.content).toContain(syntheticsTools.manageMonitor);
    expect(skill.content).toContain('HTTP');
  });

  it('passes the agent-builder skillDefinition schema (length limits, regexes, tool count)', async () => {
    await expect(validateSkillDefinition(skill)).resolves.toBe(skill);
  });
});

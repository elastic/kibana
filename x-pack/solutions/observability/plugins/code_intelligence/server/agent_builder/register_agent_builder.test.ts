/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAllowedBuiltinTool,
  isAllowedSkillRegistration,
} from '@kbn/agent-builder-server/allow_lists';

import { registerAgentBuilder } from './register_agent_builder';
import { createCodeIntelligenceSkill } from './skills/code_intelligence_skill';

const dependencies = {
  catalogIndex: 'catalog',
  settingsIndex: 'settings',
  getServices: () => ({ getSpaceId: () => 'default' }),
};

describe('registerAgentBuilder', () => {
  it('does nothing when Agent Builder is not available', () => {
    expect(() => registerAgentBuilder({ ...dependencies, agentBuilder: undefined })).not.toThrow();
  });

  it('registers the 5 catalog tools and the skill', () => {
    const agentBuilder = { tools: { register: jest.fn() }, skills: { register: jest.fn() } };

    registerAgentBuilder({ ...dependencies, agentBuilder });

    expect(agentBuilder.tools.register.mock.calls.map(([tool]) => tool.id)).toEqual([
      'observability.code_intelligence.list_repositories',
      'observability.code_intelligence.upsert_repository',
      'observability.code_intelligence.start_extraction',
      'observability.code_intelligence.get_extraction_status',
      'observability.code_intelligence.search_catalog',
    ]);
    expect(agentBuilder.skills.register).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'observability.code-intelligence' })
    );
  });

  it('registers only tools and skills on the Agent Builder allow lists', () => {
    const agentBuilder = { tools: { register: jest.fn() }, skills: { register: jest.fn() } };

    registerAgentBuilder({ ...dependencies, agentBuilder });

    for (const [{ id }] of agentBuilder.tools.register.mock.calls) {
      expect(isAllowedBuiltinTool(id)).toBe(true);
    }
    for (const [skill] of agentBuilder.skills.register.mock.calls) {
      expect(isAllowedSkillRegistration(skill)).toBe(true);
    }
  });
});

describe('code intelligence skill', () => {
  const skill = createCodeIntelligenceSkill();

  it('exposes the catalog tools and ES|QL execution', async () => {
    expect(await skill.getRegistryTools?.()).toEqual([
      'observability.code_intelligence.list_repositories',
      'observability.code_intelligence.upsert_repository',
      'observability.code_intelligence.start_extraction',
      'observability.code_intelligence.get_extraction_status',
      'observability.code_intelligence.search_catalog',
      'platform.core.execute_esql',
    ]);
  });

  it('lives under the observability skills with a description within the limit', () => {
    expect(skill).toEqual(
      expect.objectContaining({ name: 'code-intelligence', basePath: 'skills/observability' })
    );
    expect(skill.description.length).toBeLessThanOrEqual(1024);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { createToolTestMocks, setupMockCoreStartServices } from '../../__mocks__/test_helpers';
import { createRecommendPrebuiltRulesSkill } from './recommend_prebuilt_rules_skill';
import { FIND_PREBUILT_RULES_INLINE_TOOL_ID } from './find_prebuilt_rules_tool';
import { GET_USER_DATA_INVENTORY_INLINE_TOOL_ID } from './get_user_data_inventory_tool';
import { GET_INSTALLABLE_CATALOG_OVERVIEW_INLINE_TOOL_ID } from './get_installable_catalog_overview_tool';
import { GET_INSTALLED_RULES_MITRE_COVERAGE_INLINE_TOOL_ID } from './get_installed_rules_mitre_coverage_tool';

const createDeps = () => {
  const { mockCore, mockLogger, mockEsClient } = createToolTestMocks();
  setupMockCoreStartServices(mockCore, mockEsClient);
  return { getStartServices: mockCore.getStartServices, logger: mockLogger };
};

describe('createRecommendPrebuiltRulesSkill', () => {
  it('has stable metadata', () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    expect(skill.id).toBe('recommend-prebuilt-rules');
    expect(skill.name).toBe('recommend-prebuilt-rules');
    expect(skill.basePath).toBe('skills/security/rules');
    expect(skill.description).toContain('prebuilt detection rules');
  });

  it('uses an allow-listed built-in skill id', () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    expect(isAllowedBuiltinSkill(skill.id)).toBe(true);
  });

  it('wires the four inline tools', async () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    const inlineTools = await skill.getInlineTools!();
    const ids = inlineTools.map((tool) => tool.id);

    expect(inlineTools).toHaveLength(4);
    expect(ids).toEqual(
      expect.arrayContaining([
        FIND_PREBUILT_RULES_INLINE_TOOL_ID,
        GET_USER_DATA_INVENTORY_INLINE_TOOL_ID,
        GET_INSTALLABLE_CATALOG_OVERVIEW_INLINE_TOOL_ID,
        GET_INSTALLED_RULES_MITRE_COVERAGE_INLINE_TOOL_ID,
      ])
    );
  });

  it('stays within the per-skill tool-count guideline (<= 7)', async () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    const registryTools = (await skill.getRegistryTools?.()) ?? [];
    const inlineTools = await skill.getInlineTools!();
    expect(registryTools.length + inlineTools.length).toBeLessThanOrEqual(7);
  });

  it('placeholder content names the tools, read-only constraint, and sibling routing', () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    expect(skill.content).toContain('security.find_prebuilt_rules');
    expect(skill.content).toContain('security.get_installable_catalog_overview');
    expect(skill.content).toMatch(/Read-Only/i);
    expect(skill.content).toContain('find-security-rules');
  });
});

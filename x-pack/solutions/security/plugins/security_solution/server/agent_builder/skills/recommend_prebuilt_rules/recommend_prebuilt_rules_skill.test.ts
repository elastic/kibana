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

  it('content names all four tools', () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    expect(skill.content).toContain(FIND_PREBUILT_RULES_INLINE_TOOL_ID);
    expect(skill.content).toContain(GET_USER_DATA_INVENTORY_INLINE_TOOL_ID);
    expect(skill.content).toContain(GET_INSTALLABLE_CATALOG_OVERVIEW_INLINE_TOOL_ID);
    expect(skill.content).toContain(GET_INSTALLED_RULES_MITRE_COVERAGE_INLINE_TOOL_ID);
  });

  it('content states the read-only constraint and routes to sibling skills', () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    expect(skill.content).toMatch(/Read-Only/i);
    expect(skill.content).toContain('find-security-rules');
    expect(skill.content).toContain('detection-rule-edit');
    expect(skill.content).toContain('alert-analysis');
    expect(skill.content).toContain('threat-hunting');
    expect(skill.content).toContain('rule-creation');
    expect(skill.content).toContain('find-security-ml-jobs');
  });

  it('content carries the mandatory discovery-before-tag-filter rule in bold', () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    expect(skill.content).toMatch(
      /\*\*Before any `security\.find_prebuilt_rules` call that uses a `tags` filter[\s\S]*?get_installable_catalog_overview[\s\S]*?\*\*/
    );
  });

  it('content includes the canonical 14 MITRE tactics', () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    const tacticIds = [
      'TA0001',
      'TA0002',
      'TA0003',
      'TA0004',
      'TA0005',
      'TA0006',
      'TA0007',
      'TA0008',
      'TA0009',
      'TA0010',
      'TA0011',
      'TA0040',
      'TA0042',
      'TA0043',
    ];
    tacticIds.forEach((id) => expect(skill.content).toContain(id));
  });

  it('content instructs the model to build install-flyout links', () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    expect(skill.content).toContain('## Rule Links');
    expect(skill.content).toContain('/app/security/rules/add_rules/<rule_id>');
    expect(skill.content).toContain('space_url_prefix');
  });

  it('content covers data-source categories and integration coverage', () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    expect(skill.content).toMatch(/endpoint, identity, cloud, network/i);
    expect(skill.content).toContain('## Integration Coverage');
    expect(skill.content).toMatch(/related_integrations\.package/);
  });

  it('caps list length (10 for a flat list, 5 per category)', () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    expect(skill.content).toMatch(/\*\*at most 10\*\*/i);
    expect(skill.content).toMatch(/\*\*at most 5 per category\*\*/i);
  });

  it('frames integration presence as a likelihood, not a runnability guarantee', () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    // The reframed coverage section must hedge: integration installed is a signal, not a promise.
    expect(skill.content).toMatch(/not a guarantee/i);
    // And it should not assert flat, unqualified runnability to the user.
    expect(skill.content).not.toMatch(/\brunnable on your (current )?data\b/i);
  });

  it('frames the skill as a personalized, customer-tailored recommender', () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    expect(skill.content).toContain('## Tailor to the Customer');
    expect(skill.content).toMatch(/personalized recommender, not a generic/i);
  });

  it('teaches progressive deepening of finalists via fields and ruleIds', () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    expect(skill.content).toContain('## Precision: Narrow, Then Deepen');
    expect(skill.content).toMatch(/\bfields\b/);
    expect(skill.content).toMatch(/\bruleIds\b/);
  });

  it('requires a wide survey pass and cutting the candidate pool down to the best fits', () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    // A wide, thin survey pass before deepening.
    expect(skill.content).toMatch(/wide, thin net|survey pass|candidate landscape/i);
    // The shortlist must be larger than the final list, so the final set is normally a subset.
    expect(skill.content).toMatch(/larger than your final/i);
    expect(skill.content).toMatch(/final set is normally a subset/i);
    // But it must not force an artificial cut when the field is genuinely tight.
    expect(skill.content).toMatch(/don't drop a genuinely strong rule/i);
    // Population awareness: survey rows are a sample of total; narrow instead of maxing perPage.
    expect(skill.content).toMatch(/sample of `total`/i);
    expect(skill.content).toMatch(/not reflexively the max|tighten the filter/i);
  });

  it('encodes the v18 tactic-criticality prioritization default as an overridable soft default', () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    expect(skill.content).toContain('## Prioritization');
    // The Critical tier in correct v18 criticality order.
    expect(skill.content).toMatch(
      /Credential Access, Lateral Movement, Privilege Escalation, Defense Evasion/
    );
    // A stated intent overrides the default ordering.
    expect(skill.content).toMatch(/overrides this entirely/i);
    // Data-source order is demoted to a tiebreaker, not the primary default.
    expect(skill.content).toMatch(/tiebreaker/i);
  });

  it('asks for a Selection notes block recording kept/dropped after a deepen pass', () => {
    const { getStartServices, logger } = createDeps();
    const skill = createRecommendPrebuiltRulesSkill({ getStartServices, logger });
    expect(skill.content).toContain('**Selection notes**');
    expect(skill.content).toMatch(/kept|dropped/i);
  });
});

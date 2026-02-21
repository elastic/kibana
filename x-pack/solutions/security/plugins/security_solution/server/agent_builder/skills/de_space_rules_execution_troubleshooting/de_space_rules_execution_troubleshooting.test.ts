/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { coreMock } from '@kbn/core/server/mocks';
import type { IRuleMonitoringService } from '../../../lib/detection_engine/rule_monitoring';
import type { SkillDependencies } from './types';
import { createDeSpaceRulesExecutionTroubleshootingSkill } from '.';

describe('createDeSpaceRulesExecutionTroubleshootingSkill', () => {
  let deps: SkillDependencies;

  beforeEach(() => {
    const mockCore = coreMock.createSetup();
    const mockRuleMonitoringService: IRuleMonitoringService = {
      setup: jest.fn(),
      start: jest.fn(),
      createDetectionEngineHealthClient: jest.fn(),
      createRuleExecutionLogClientForRoutes: jest.fn(),
      createRuleExecutionLogClientForExecutors: jest.fn(),
    };

    deps = {
      core: mockCore,
      ruleMonitoringService: mockRuleMonitoringService,
    };
  });

  describe('skill definition', () => {
    it('includes system instructions in content', () => {
      const skill = createDeSpaceRulesExecutionTroubleshootingSkill(deps);

      expect(skill.content).toContain('Detection Engine Space Rules Execution Troubleshooting');
      expect(skill.content).toContain('When to Use This Skill');
      expect(skill.content).toContain('Troubleshooting Tools');
      expect(skill.content).toContain('Troubleshooting Approach');
      expect(skill.content).toContain('Severity Assessment Guidelines');
      expect(skill.content).toContain('Edge Cases');
      expect(skill.content).toContain('Constraints');
      expect(skill.content).toContain('Space Health API');
    });

    it('does not include referenced content (uses API instead of indices)', () => {
      const skill = createDeSpaceRulesExecutionTroubleshootingSkill(deps);

      expect(skill.referencedContent).toBeUndefined();
    });
  });

  describe('getRegistryTools', () => {
    it('returns the correct platform core tools', () => {
      const skill = createDeSpaceRulesExecutionTroubleshootingSkill(deps);

      const allowedTools = skill.getRegistryTools?.();

      expect(allowedTools).toBeDefined();
      expect(allowedTools).toHaveLength(3);
      expect(allowedTools).toContain(platformCoreTools.search);
      expect(allowedTools).toContain(platformCoreTools.getDocumentById);
      expect(allowedTools).toContain(platformCoreTools.productDocumentation);
    });
  });

  describe('getInlineTools', () => {
    it('returns two inline tools', () => {
      const skill = createDeSpaceRulesExecutionTroubleshootingSkill(deps);

      const inlineTools = skill.getInlineTools?.();

      expect(inlineTools).toBeDefined();
      expect(inlineTools).toHaveLength(2);
    });

    it('includes get_space_health tool', async () => {
      const skill = createDeSpaceRulesExecutionTroubleshootingSkill(deps);

      const inlineTools = await skill.getInlineTools?.();

      const spaceHealthTool = inlineTools?.find((tool) => tool.id.includes('get_space_health'));

      expect(spaceHealthTool).toBeDefined();
      expect(spaceHealthTool?.description).toContain(
        'Fetches aggregated health overview for all detection rules'
      );
    });

    it('includes generate_insight tool', async () => {
      const skill = createDeSpaceRulesExecutionTroubleshootingSkill(deps);

      const inlineTools = await skill.getInlineTools?.();

      const insightTool = inlineTools?.find((tool) => tool.id.includes('generate_insight'));

      expect(insightTool).toBeDefined();
      expect(insightTool?.description).toContain(
        'Generate and store structured Detection Engine space health troubleshooting insights'
      );
    });
  });
});

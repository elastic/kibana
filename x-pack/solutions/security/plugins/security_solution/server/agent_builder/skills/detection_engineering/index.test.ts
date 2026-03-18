/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { SECURITY_FIND_RULES_TOOL_ID } from '../../tools/find_rules_tool';
import { SECURITY_MANAGE_RULES_TOOL_ID } from '../../tools/manage_rules_tool';
import { SECURITY_PREVIEW_RULE_TOOL_ID } from '../../tools/preview_rule_tool';
import { SECURITY_MANAGE_EXCEPTIONS_TOOL_ID } from '../../tools/manage_exceptions_tool';
import { SECURITY_COVERAGE_OVERVIEW_TOOL_ID } from '../../tools/coverage_overview_tool';
import { SECURITY_RULE_MONITORING_TOOL_ID } from '../../tools/rule_monitoring_tool';
import { SECURITY_ALERTS_TOOL_ID } from '../../tools/alerts_tool';
import { SECURITY_CREATE_DETECTION_RULE_TOOL_ID } from '../../tools/create_detection_rule_tool';
import { SECURITY_LABS_SEARCH_TOOL_ID } from '../../tools/security_labs_search_tool';
import { getDetectionEngineeringSkill } from '.';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import type { Logger } from '@kbn/core/server';

jest.mock('../../tools/find_rules_tool', () => ({
  findRulesTool: jest.fn(() => ({ id: 'security.find_rules', type: 'tool' })),
  SECURITY_FIND_RULES_TOOL_ID: 'security.find_rules',
}));
jest.mock('../../tools/manage_rules_tool', () => ({
  manageRulesTool: jest.fn(() => ({ id: 'security.manage_rules', type: 'tool' })),
  SECURITY_MANAGE_RULES_TOOL_ID: 'security.manage_rules',
}));
jest.mock('../../tools/preview_rule_tool', () => ({
  previewRuleTool: jest.fn(() => ({ id: 'security.preview_rule', type: 'tool' })),
  SECURITY_PREVIEW_RULE_TOOL_ID: 'security.preview_rule',
}));
jest.mock('../../tools/manage_exceptions_tool', () => ({
  manageExceptionsTool: jest.fn(() => ({ id: 'security.manage_exceptions', type: 'tool' })),
  SECURITY_MANAGE_EXCEPTIONS_TOOL_ID: 'security.manage_exceptions',
}));
jest.mock('../../tools/coverage_overview_tool', () => ({
  coverageOverviewTool: jest.fn(() => ({ id: 'security.coverage_overview', type: 'tool' })),
  SECURITY_COVERAGE_OVERVIEW_TOOL_ID: 'security.coverage_overview',
}));
jest.mock('../../tools/rule_monitoring_tool', () => ({
  ruleMonitoringTool: jest.fn(() => ({ id: 'security.rule_monitoring', type: 'tool' })),
  SECURITY_RULE_MONITORING_TOOL_ID: 'security.rule_monitoring',
}));

describe('getDetectionEngineeringSkill', () => {
  const mockCore = {} as SecuritySolutionPluginCoreSetupDependencies;
  const mockLogger = { debug: jest.fn(), error: jest.fn() } as unknown as Logger;

  const skill = getDetectionEngineeringSkill({ core: mockCore, logger: mockLogger });

  describe('skill definition', () => {
    it('returns a valid skill definition', () => {
      expect(skill).toBeDefined();
      expect(skill.id).toBe('detection-engineering');
      expect(skill.name).toBe('detection-engineering');
      expect(skill.basePath).toBe('skills/security/alerts/rules');
      expect(skill.description).toContain('detection engineering');
      expect(skill.content).toContain('Detection Engineering Guide');
    });

    it('includes referenced content with best practices and MITRE guidance', () => {
      expect(skill.referencedContent).toBeDefined();
      expect(skill.referencedContent).toHaveLength(2);

      const bestPractices = skill.referencedContent!.find(
        (rc) => rc.name === 'detection-best-practices'
      );
      expect(bestPractices).toBeDefined();
      expect(bestPractices!.relativePath).toBe('./reference');
      expect(bestPractices!.content).toContain('Rule Type Decision Matrix');

      const mitreGuide = skill.referencedContent!.find((rc) => rc.name === 'mitre-mapping-guide');
      expect(mitreGuide).toBeDefined();
      expect(mitreGuide!.relativePath).toBe('./reference');
      expect(mitreGuide!.content).toContain('MITRE ATT&CK Mapping Guide');
    });
  });

  describe('content', () => {
    it('includes tool descriptions for all registered tools', () => {
      expect(skill.content).toContain('security.find_rules');
      expect(skill.content).toContain('security.manage_rules');
      expect(skill.content).toContain('security.preview_rule');
      expect(skill.content).toContain('security.manage_exceptions');
      expect(skill.content).toContain('security.coverage_overview');
      expect(skill.content).toContain('security.rule_monitoring');
      expect(skill.content).toContain('security.alerts');
      expect(skill.content).toContain('security.create_detection_rule');
      expect(skill.content).toContain('security.security_labs_search');
      expect(skill.content).toContain('platform.core.cases');
      expect(skill.content).toContain('platform.core.execute_esql');
      expect(skill.content).toContain('platform.core.generate_esql');
    });

    it('includes workflow descriptions', () => {
      expect(skill.content).toContain('Workflow A: Threat Report Analysis');
      expect(skill.content).toContain('Workflow B: Prebuilt Rules Onboarding');
      expect(skill.content).toContain('Workflow C: Custom Rule Creation');
      expect(skill.content).toContain('Workflow D: Rule Tuning');
      expect(skill.content).toContain('Workflow E: Rule Health Monitoring');
      expect(skill.content).toContain('Workflow F: Exception Maintenance');
    });

    it('includes e2e scenario examples', () => {
      expect(skill.content).toContain('Example 1: New Integration Data Source');
      expect(skill.content).toContain('Example 2: Threat Report Response');
      expect(skill.content).toContain('Example 3: New Customer SIEM Onboarding');
      expect(skill.content).toContain('Example 4: Splunk/QRadar Migration');
    });

    it('includes rule type selection guide', () => {
      expect(skill.content).toContain('Rule Type Selection Guide');
      expect(skill.content).toContain('KQL');
      expect(skill.content).toContain('EQL');
      expect(skill.content).toContain('ES|QL');
      expect(skill.content).toContain('Threshold');
      expect(skill.content).toContain('ML');
    });
  });

  describe('getRegistryTools', () => {
    it('returns only pre-existing security and platform tools (not inline tools)', () => {
      const tools = skill.getRegistryTools?.();

      expect(tools).toBeDefined();
      expect(tools).toContain(SECURITY_ALERTS_TOOL_ID);
      expect(tools).toContain(SECURITY_CREATE_DETECTION_RULE_TOOL_ID);
      expect(tools).toContain(SECURITY_LABS_SEARCH_TOOL_ID);
      expect(tools).toContain(platformCoreTools.cases);
      expect(tools).toContain(platformCoreTools.executeEsql);
      expect(tools).toContain(platformCoreTools.generateEsql);
    });

    it('does not include inline tool IDs', () => {
      const tools = skill.getRegistryTools?.();

      expect(tools).not.toContain(SECURITY_FIND_RULES_TOOL_ID);
      expect(tools).not.toContain(SECURITY_MANAGE_RULES_TOOL_ID);
      expect(tools).not.toContain(SECURITY_PREVIEW_RULE_TOOL_ID);
      expect(tools).not.toContain(SECURITY_MANAGE_EXCEPTIONS_TOOL_ID);
      expect(tools).not.toContain(SECURITY_COVERAGE_OVERVIEW_TOOL_ID);
      expect(tools).not.toContain(SECURITY_RULE_MONITORING_TOOL_ID);
    });

    it('returns correct total number of registry tools', () => {
      const tools = skill.getRegistryTools?.();

      expect(tools).toHaveLength(6);
    });
  });

  describe('getInlineTools', () => {
    it('returns all 6 detection engineering inline tools', async () => {
      const inlineTools = await skill.getInlineTools?.();

      expect(inlineTools).toBeDefined();
      expect(inlineTools).toHaveLength(6);
    });

    it('returns tools with correct IDs', async () => {
      const inlineTools = await skill.getInlineTools?.();
      const toolIds = inlineTools?.map((t: { id: string }) => t.id);

      expect(toolIds).toContain(SECURITY_FIND_RULES_TOOL_ID);
      expect(toolIds).toContain(SECURITY_MANAGE_RULES_TOOL_ID);
      expect(toolIds).toContain(SECURITY_PREVIEW_RULE_TOOL_ID);
      expect(toolIds).toContain(SECURITY_MANAGE_EXCEPTIONS_TOOL_ID);
      expect(toolIds).toContain(SECURITY_COVERAGE_OVERVIEW_TOOL_ID);
      expect(toolIds).toContain(SECURITY_RULE_MONITORING_TOOL_ID);
    });
  });
});

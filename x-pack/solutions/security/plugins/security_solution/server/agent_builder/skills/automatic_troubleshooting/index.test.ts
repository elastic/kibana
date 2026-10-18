/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';

import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { createMockEndpointAppContext } from '../../../endpoint/mocks';
import { createAutomaticTroubleshootingSkill } from '.';

describe('createAutomaticTroubleshootingSkill', () => {
  let mockEndpointAppContextService: EndpointAppContextService;

  beforeEach(() => {
    mockEndpointAppContextService = createMockEndpointAppContext().service;
  });

  describe('skill definition', () => {
    it('returns a valid skill definition', () => {
      const skill = createAutomaticTroubleshootingSkill(mockEndpointAppContextService);

      expect(skill).toBeDefined();
      expect(skill.id).toBe('automatic_troubleshooting');
      expect(skill.name).toBe('elastic-defend-configuration-troubleshooting');
      expect(skill.basePath).toBe('skills/security/endpoint');
      expect(skill.description).toContain('Troubleshoot Elastic Defend endpoint health');
      expect(skill.content).toContain('Elastic Defend Configuration Troubleshooting');
    });

    it('includes available indices in referenced content', () => {
      const skill = createAutomaticTroubleshootingSkill(mockEndpointAppContextService);

      expect(skill.referencedContent).toBeDefined();
      expect(skill.referencedContent).toHaveLength(1);
      expect(skill.referencedContent![0].name).toBe('available_indices');
      expect(skill.referencedContent![0].relativePath).toBe('.');
      expect(skill.referencedContent![0].content).toContain('metrics-endpoint.metadata');
    });

    it('includes system instructions in content', () => {
      const skill = createAutomaticTroubleshootingSkill(mockEndpointAppContextService);

      expect(skill.content).toContain('Elastic Defend Configuration Troubleshooting');
      expect(skill.content).toContain('When to use this skill');
      expect(skill.content).toContain('Available Indices');
      expect(skill.content).toContain('Troubleshooting Tools');
      expect(skill.content).toContain('Troubleshooting Approach');
      expect(skill.content).toContain('Scoped investigation framework');
      expect(skill.content).toContain('Example integration knowledge queries');
      expect(skill.content).toContain('Constraints');
    });

    it('documents every scoped-investigation classification the framework branches on', () => {
      const skill = createAutomaticTroubleshootingSkill(mockEndpointAppContextService);

      expect(skill.content).toContain('CURRENTLY_HEALTHY');
      expect(skill.content).toContain('CURRENT_POLICY_FAILURE');
      expect(skill.content).toContain('RECOVERED_POLICY_FAILURE');
      expect(skill.content).toContain('NON_POLICY_HEALTH_FAILURE');
      expect(skill.content).toContain('OTHER_CURRENT_ISSUE');
    });
  });

  // Regression fixture for run bk-01a14b73-endpoint, build 01a14b73-3b78-4ca6-b2c5-e5ce35986c37
  // (commit 8f4c1fcc). Two examples failed because a healthy-looking endpoint ended a question
  // that named a symptom before the seeded evidence was queried:
  //   - endpoint: incompatible antivirus detection (gemini-3.1-pro trace
  //     98a75e659cf439607b9000ff6489d307, gpt-5.4 trace 545c8f72b3015f886d4ec914c787be33) -
  //     the answer was "the endpoint is healthy with no evidence of conflicts" without querying
  //     logs-endpoint.events.process-*, where the conflicting-software events are seeded.
  //   - endpoint: endpoint_exception_field_mismatch_explicit_prompt - the answer never compared the
  //     exception's file.path against the alert/process field process.executable.
  // These assertions cover the guidance that has to exist for those investigations to happen.
  describe('named-symptom evidence rule', () => {
    it('requires the named symptom evidence index to be queried before a no-issue verdict', () => {
      const skill = createAutomaticTroubleshootingSkill(mockEndpointAppContextService);
      const content = skill.content;

      expect(content).toMatch(/\*\*Named-symptom evidence rule\*\*/);
      expect(content).toMatch(/conflicting or incompatible security software/i);
      expect(content).toMatch(/logs-endpoint\.events\.process-\*/);
      expect(content).toMatch(/logs-endpoint\.alerts-\*/);
      expect(content).toMatch(/Never answer a named-symptom question with/i);
    });

    it('does not let a healthy current state satisfy the evidence requirement for a named symptom', () => {
      const skill = createAutomaticTroubleshootingSkill(mockEndpointAppContextService);
      const content = skill.content;

      expect(content).toContain('only when the user did not name a symptom');
      expect(content).toMatch(
        /healthy current state is never evidence that a named symptom is absent/i
      );
      // the general-health short-circuit is unchanged for questions that name no symptom
      expect(content).toContain('question that names no symptom');
      expect(content).toContain(
        'ask for the specific symptom, affected time range, alert/event, or behavior they want investigated'
      );
    });

    it('spends the tool-call budget on the named symptom instead of forbidding the lookup', () => {
      const skill = createAutomaticTroubleshootingSkill(mockEndpointAppContextService);
      const content = skill.content;

      expect(content).toContain(
        "Spend that budget on targeted queries against the named symptom's evidence index first"
      );
      expect(content).not.toContain(
        'Avoid broad log searches when the user names a specific endpoint and symptom.'
      );
    });
  });

  describe('getRegistryTools', () => {
    it('returns the correct platform core tools', () => {
      const skill = createAutomaticTroubleshootingSkill(mockEndpointAppContextService);

      const allowedTools = skill.getRegistryTools?.();

      expect(allowedTools).toBeDefined();
      expect(allowedTools).toHaveLength(3);
      expect(allowedTools).toContain(platformCoreTools.search);
      expect(allowedTools).toContain(platformCoreTools.getDocumentById);
      expect(allowedTools).toContain(platformCoreTools.integrationKnowledge);
    });
  });

  describe('getInlineTools', () => {
    it('returns four inline tools', () => {
      const skill = createAutomaticTroubleshootingSkill(mockEndpointAppContextService);

      const inlineTools = skill.getInlineTools?.();

      expect(inlineTools).toBeDefined();
      expect(inlineTools).toHaveLength(4);
    });

    it('includes get_package_configurations tool', async () => {
      const skill = createAutomaticTroubleshootingSkill(mockEndpointAppContextService);

      const inlineTools = await skill.getInlineTools?.();

      const getPackageConfigTool = inlineTools?.find((tool) =>
        tool.id.includes('get_package_configurations')
      );

      expect(getPackageConfigTool).toBeDefined();
      expect(getPackageConfigTool?.description).toContain('Fetches Elastic Defend package');
    });

    it('includes generate_insight tool', async () => {
      const skill = createAutomaticTroubleshootingSkill(mockEndpointAppContextService);

      const inlineTools = await skill.getInlineTools?.();

      const generateInsightTool = inlineTools?.find((tool) => tool.id.includes('generate_insight'));

      expect(generateInsightTool).toBeDefined();
      expect(generateInsightTool?.description).toContain('Generate and store structured');
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';

import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { createMockEndpointAppContext } from '../../../endpoint/mocks';
import { allowedExperimentalValues } from '../../../../common/experimental_features';
import { createAutomaticTroubleshootingSkill } from '.';

describe('createAutomaticTroubleshootingSkill', () => {
  let mockEndpointAppContextService: EndpointAppContextService;

  beforeEach(() => {
    mockEndpointAppContextService = createMockEndpointAppContext().service;
  });

  describe('skill definition', () => {
    it('returns a valid skill definition', () => {
      const skill = createAutomaticTroubleshootingSkill(
        mockEndpointAppContextService,
        allowedExperimentalValues
      );

      expect(skill).toBeDefined();
      expect(skill.id).toBe('automatic_troubleshooting');
      expect(skill.name).toBe('elastic-defend-configuration-troubleshooting');
      expect(skill.basePath).toBe('skills/security/endpoint');
      expect(skill.description).toContain(
        'observed Elastic Defend endpoint behavior and operational outcomes'
      );
      expect(skill.content).toContain('Elastic Defend Configuration Troubleshooting');
    });

    it('claims endpoint diagnosis intents near the start of the description', () => {
      const skill = createAutomaticTroubleshootingSkill(
        mockEndpointAppContextService,
        allowedExperimentalValues
      );
      const description = skill.description ?? '';

      expect(description.slice(0, 400)).toMatch(/offline.*unhealthy|unhealthy.*offline/is);
      expect(description).toMatch(/missing or not reporting/i);
      expect(description).toMatch(/isolation or release failed|response action .* failed/is);
      expect(description.length).toBeLessThanOrEqual(1024);
    });

    it('includes available indices in referenced content', () => {
      const skill = createAutomaticTroubleshootingSkill(
        mockEndpointAppContextService,
        allowedExperimentalValues
      );

      expect(skill.referencedContent).toBeDefined();
      expect(skill.referencedContent).toHaveLength(1);
      expect(skill.referencedContent![0].name).toBe('available_indices');
      expect(skill.referencedContent![0].relativePath).toBe('.');
      expect(skill.referencedContent![0].content).toContain('metrics-endpoint.metadata');
    });

    it('includes system instructions in content', () => {
      const skill = createAutomaticTroubleshootingSkill(
        mockEndpointAppContextService,
        allowedExperimentalValues
      );

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
      const skill = createAutomaticTroubleshootingSkill(
        mockEndpointAppContextService,
        allowedExperimentalValues
      );

      expect(skill.content).toContain('CURRENTLY_HEALTHY');
      expect(skill.content).toContain('CURRENT_POLICY_FAILURE');
      expect(skill.content).toContain('RECOVERED_POLICY_FAILURE');
      expect(skill.content).toContain('NON_POLICY_HEALTH_FAILURE');
      expect(skill.content).toContain('OTHER_CURRENT_ISSUE');
    });
  });

  describe('getRegistryTools', () => {
    it('returns the correct platform core tools', () => {
      const skill = createAutomaticTroubleshootingSkill(
        mockEndpointAppContextService,
        allowedExperimentalValues
      );

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
      const skill = createAutomaticTroubleshootingSkill(
        mockEndpointAppContextService,
        allowedExperimentalValues
      );

      const inlineTools = skill.getInlineTools?.();

      expect(inlineTools).toBeDefined();
      expect(inlineTools).toHaveLength(4);
    });

    it('includes get_package_configurations tool', async () => {
      const skill = createAutomaticTroubleshootingSkill(
        mockEndpointAppContextService,
        allowedExperimentalValues
      );

      const inlineTools = await skill.getInlineTools?.();

      const getPackageConfigTool = inlineTools?.find((tool) =>
        tool.id.includes('get_package_configurations')
      );

      expect(getPackageConfigTool).toBeDefined();
      expect(getPackageConfigTool?.description).toContain('Fetches Elastic Defend package');
    });

    it('includes generate_insight tool', async () => {
      const skill = createAutomaticTroubleshootingSkill(
        mockEndpointAppContextService,
        allowedExperimentalValues
      );

      const inlineTools = await skill.getInlineTools?.();

      const generateInsightTool = inlineTools?.find((tool) => tool.id.includes('generate_insight'));

      expect(generateInsightTool).toBeDefined();
      expect(generateInsightTool?.description).toContain('Generate and store structured');
    });
  });

  describe('custom YARA signatures', () => {
    const createSkill = (customYaraSignaturesEnabled: boolean) =>
      createAutomaticTroubleshootingSkill(mockEndpointAppContextService, {
        ...allowedExperimentalValues,
        customYaraSignaturesEnabled,
      });

    it('does not mention custom YARA signatures when the feature flag is disabled', async () => {
      const skill = createSkill(false);
      const inlineTools = await skill.getInlineTools?.();
      const artifactsTool = inlineTools?.find((tool) => tool.id.includes('get_endpoint_artifacts'));

      expect(skill.content).not.toMatch(/yara/i);
      expect(skill.description).not.toMatch(/yara/i);
      expect(artifactsTool?.description).not.toMatch(/yara/i);
    });

    it('adds custom YARA signatures guidance when the feature flag is enabled', async () => {
      const skill = createSkill(true);
      const inlineTools = await skill.getInlineTools?.();
      const artifactsTool = inlineTools?.find((tool) => tool.id.includes('get_endpoint_artifacts'));

      expect(skill.content).toContain(
        'or missing alerts, or custom YARA signatures not matching, not alerting, or not reaching an endpoint, use'
      );
      expect(skill.content).toContain('the artifactType is `custom_yara_signatures`');
      expect(skill.content).toContain('rule.custom_yara_signature.entry_id');
      expect(skill.content).toContain(
        'page through `custom_yara_signatures` for the policy without `search` and compare each `id` to `entry_id`'
      );
      expect(skill.content).toContain('memory_protection.custom_yara_signatures');
      expect(skill.content).toContain('endpoint-yararules');
      expect(skill.content).toContain('Endpoint.policy.applied.artifacts.user.identifiers');
      expect(skill.content).toContain(
        `from \`metrics-endpoint.policy-*\` with ${platformCoreTools.getDocumentById}`
      );
      expect(skill.content).toContain('That field is nested, so search queries on it can miss');
      expect(skill.content).toContain(
        'The Elastic Defend knowledge base has no custom YARA signatures content yet'
      );
      expect(skill.content).not.toContain('- `Elastic Defend custom YARA signatures');
      expect(skill.description).toContain('custom YARA signatures');
      expect(skill.description?.length).toBeLessThanOrEqual(1024);
      expect(artifactsTool?.description).toContain('custom YARA signatures');
    });

    it('leaves classification and knowledge retrieval to the scoped investigation framework', () => {
      const countOccurrences = (content: string, term: string) => content.split(term).length - 1;
      const disabledContent = createSkill(false).content;
      const enabledContent = createSkill(true).content;

      for (const term of [
        'OTHER_CURRENT_ISSUE',
        'NON_POLICY_HEALTH_FAILURE',
        platformCoreTools.integrationKnowledge,
      ]) {
        expect(countOccurrences(enabledContent, term)).toBe(
          countOccurrences(disabledContent, term)
        );
      }
    });
  });
});

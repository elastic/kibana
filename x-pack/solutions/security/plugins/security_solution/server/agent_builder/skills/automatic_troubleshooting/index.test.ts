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

  describe('symptom-named evidence routing', () => {
    /*
     * Regression fixtures: the recorded agent trajectories of eval run
     * bk-01a14b73-endpoint (build 01a14b73-3b78-4ca6-b2c5-e5ce35986c37, commit 8f4c1fcc6a51)
     * in which the model answered a question that named a symptom on a healthy-looking
     * endpoint without querying the index holding the seeded evidence for that symptom.
     * `evidenceIndex` is the seeded index the trajectory never queried, `queriedIndices`
     * what it searched instead and `symptomPattern` the wording the guidance must use for
     * that symptom class. The judges named the gap from the answer side: "the
     * investigation found the endpoint healthy with no evidence of conflicts" and "no
     * query was made to logs-endpoint.alerts-* ... only provided generic advice".
     */
    const FAILING_TRAJECTORIES = [
      {
        model: 'google-gemini-3.1-pro',
        example: 'endpoint: incompatible antivirus detection',
        traceId: '98a75e659cf439607b9000ff6489d307',
        criteria: 0.75,
        symptomPattern: 'conflicting or incompatible',
        evidenceIndex: 'logs-endpoint.events.process-default',
        queriedIndices: [
          'metrics-endpoint.metadata_current_default',
          'metrics-endpoint.policy-default',
        ],
      },
      {
        model: 'openai-gpt-5.4',
        example: 'endpoint: incompatible antivirus detection',
        traceId: '545c8f72b3015f886d4ec914c787be33',
        criteria: 0.75,
        symptomPattern: 'conflicting or incompatible',
        evidenceIndex: 'logs-endpoint.events.process-default',
        queriedIndices: [
          'metrics-endpoint.metadata_current_default',
          'metrics-endpoint.policy-default',
        ],
      },
      {
        model: 'google-gemini-3.1-pro',
        example: 'endpoint: endpoint_exception_field_mismatch_explicit_prompt',
        traceId: '8b5aaede38b79c3176b05d8a8aa58589',
        criteria: 0.714,
        symptomPattern: 'exception, allowlist',
        evidenceIndex: 'logs-endpoint.alerts-default',
        queriedIndices: [
          '.fleet-agents',
          'metrics-endpoint.metadata_current_default',
          'metrics-endpoint.policy-default',
        ],
      },
      {
        model: 'openai-gpt-5.4',
        example: 'endpoint: endpoint_exception_field_mismatch_explicit_prompt',
        traceId: 'a96588c4a4c3583d84f36512c85a81d0',
        criteria: 0.857,
        symptomPattern: 'exception, allowlist',
        evidenceIndex: 'logs-endpoint.alerts-default',
        queriedIndices: [
          '.fleet-agents',
          'metrics-endpoint.metadata_current_default',
          'metrics-endpoint.policy-default',
        ],
      },
    ];

    /** logs-endpoint.events.process-default -> logs-endpoint.events.process-* */
    const indexPatternOf = (index: string) => `${index.slice(0, index.lastIndexOf('-'))}-*`;

    const frameworkSection = (content: string, heading: string) => {
      const start = content.indexOf(heading);
      if (start === -1) {
        throw new Error(`the skill instructions do not document "${heading}"`);
      }
      const rest = content.slice(start + heading.length);
      const end = rest.search(/\n\d+\. \*\*|\n## /);
      return end === -1 ? rest : rest.slice(0, end);
    };

    it('routes every recorded symptom-named failure to the evidence index its trajectory never queried', () => {
      const skill = createAutomaticTroubleshootingSkill(mockEndpointAppContextService);
      const rule = frameworkSection(skill.content, '**Symptom-named evidence rule**');

      for (const trajectory of FAILING_TRAJECTORIES) {
        expect({
          trace: trajectory.traceId,
          queriedTheSeededEvidenceIndex: trajectory.queriedIndices.includes(
            trajectory.evidenceIndex
          ),
        }).toEqual({ trace: trajectory.traceId, queriedTheSeededEvidenceIndex: false });

        expect(rule).toMatch(new RegExp(trajectory.symptomPattern, 'i'));
        expect(rule).toContain(indexPatternOf(trajectory.evidenceIndex));
      }
    });

    it('does not let a healthy current state end a symptom-named investigation', () => {
      const skill = createAutomaticTroubleshootingSkill(mockEndpointAppContextService);
      const healthyPath = frameworkSection(skill.content, '**Currently healthy policy path**');
      const classification = frameworkSection(skill.content, '**Classify the current problem**');

      expect(healthyPath).toMatch(/named a symptom/i);
      expect(healthyPath).toMatch(/symptom-named evidence rule/i);
      expect(classification).toMatch(/named a symptom/i);
      expect(classification).toMatch(/OTHER_CURRENT_ISSUE/);
    });

    it('forbids a "no issue found" verdict on a symptom-named question before the evidence query', () => {
      const skill = createAutomaticTroubleshootingSkill(mockEndpointAppContextService);
      const forbidden = frameworkSection(skill.content, '## FORBIDDEN RESPONSES');

      expect(forbidden).toMatch(/no conflicts found/i);
      expect(forbidden).toMatch(/without having queried that symptom's evidence index/i);
    });

    it('keeps the healthy short-circuit for general health questions that name no symptom', () => {
      const skill = createAutomaticTroubleshootingSkill(mockEndpointAppContextService);

      expect(skill.content).toContain(
        'For a general "why is this endpoint unhealthy?" question, stop after current endpoint state and newest policy response checks show healthy/success.'
      );
      expect(skill.content).toContain(
        'ask for the specific symptom, affected time range, alert/event, or behavior they want investigated'
      );
    });
  });
});

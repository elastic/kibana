/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';

import { GET_EXECUTION_SUMMARY_TOOL_ID } from './tools/get_execution_summary_tool';
import type { WorkflowFetcher } from './tools/get_workflow_health_check_tool';
import { GET_WORKFLOW_HEALTH_CHECK_TOOL_ID } from './tools/get_workflow_health_check_tool';
import { createWorkflowTroubleshootingSkill } from './workflow_troubleshooting_skill';

const VALIDATE_WORKFLOW_TOOL_ID = 'platform.workflows.validate_workflow';
const GET_STEP_DEFINITIONS_TOOL_ID = 'platform.workflows.get_step_definitions';

describe('createWorkflowTroubleshootingSkill', () => {
  const mockFetcher: WorkflowFetcher = {
    getWorkflow: jest.fn(),
    getWorkflowExecution: jest.fn(),
  };

  const skill = createWorkflowTroubleshootingSkill(mockFetcher);

  it('passes validateSkillDefinition without error', async () => {
    await expect(validateSkillDefinition(skill)).resolves.toEqual(skill);
  });

  describe('id', () => {
    it('has the expected id', () => {
      expect(skill.id).toBe('attack-discovery-workflow-troubleshooting');
    });
  });

  describe('name', () => {
    it('has the expected name', () => {
      expect(skill.name).toBe('attack-discovery-workflow-troubleshooting');
    });

    it('contains only lowercase letters, numbers, and hyphens', () => {
      expect(skill.name).toMatch(/^[a-z0-9-_]+$/);
    });

    it('is at most 64 characters', () => {
      expect(skill.name.length).toBeLessThanOrEqual(64);
    });
  });

  describe('basePath', () => {
    it('has the expected basePath', () => {
      expect(skill.basePath).toBe('skills/security/attack-discovery');
    });
  });

  describe('description', () => {
    it('is non-empty', () => {
      expect(skill.description.length).toBeGreaterThan(0);
    });

    it('is at most 1024 characters', () => {
      expect(skill.description.length).toBeLessThanOrEqual(1024);
    });

    it('mentions workflow troubleshooting', () => {
      expect(skill.description.toLowerCase()).toContain('troubleshoot');
    });
  });

  describe('content', () => {
    it('is non-empty', () => {
      expect(skill.content.length).toBeGreaterThan(0);
    });

    it('describes the 3-phase pipeline architecture', () => {
      expect(skill.content).toContain('alert retrieval');
      expect(skill.content).toContain('generation');
      expect(skill.content).toContain('validation');
    });

    it('describes the troubleshooting approach with checkmark and cross icons', () => {
      expect(skill.content).toContain('✅');
      expect(skill.content).toContain('❌');
    });

    it('includes read-only constraints about no workflow modification', () => {
      expect(skill.content.toLowerCase()).toContain('do not modify');
    });

    it('includes read-only constraints about no ES|QL execution', () => {
      expect(skill.content).toContain('ES|QL');
    });

    it('lists the validate_workflow tool', () => {
      expect(skill.content).toContain(VALIDATE_WORKFLOW_TOOL_ID);
    });

    it('lists the get_step_definitions tool', () => {
      expect(skill.content).toContain(GET_STEP_DEFINITIONS_TOOL_ID);
    });

    it('lists the get_workflow_execution_status tool', () => {
      expect(skill.content).toContain(platformCoreTools.getWorkflowExecutionStatus);
    });

    it('lists the get_execution_summary tool', () => {
      expect(skill.content).toContain(GET_EXECUTION_SUMMARY_TOOL_ID);
    });

    it('lists the get_workflow_health_check tool', () => {
      expect(skill.content).toContain(GET_WORKFLOW_HEALTH_CHECK_TOOL_ID);
    });

    it('describes Step 2 for checking workflow health', () => {
      expect(skill.content).toContain('Check Workflow Health');
    });

    it('includes an anti-pattern guard against suggesting RBAC without direct evidence', () => {
      expect(skill.content).toContain(
        'Do NOT suggest RBAC/permission fixes unless there is direct evidence'
      );
    });

    it('explicitly forbids inferring permission errors from timeouts', () => {
      expect(skill.content).toContain(
        'timeout` status — generation timeouts are caused by LLM latency'
      );
    });
  });

  describe('referencedContent', () => {
    it('includes four referenced content sections', () => {
      expect(skill.referencedContent).toHaveLength(4);
    });

    describe('attack_discovery_step_types', () => {
      const getStepTypesContent = () =>
        skill.referencedContent?.find((r) => r.name === 'attack-discovery-step-types');

      it('exists', () => {
        expect(getStepTypesContent()).toBeDefined();
      });

      it('has non-empty content', () => {
        expect(getStepTypesContent()?.content.length).toBeGreaterThan(0);
      });

      it('describes custom step types', () => {
        const { content } = getStepTypesContent() ?? {};

        expect(content).toContain('attack-discovery');
      });

      it('includes failure modes', () => {
        const { content } = getStepTypesContent() ?? {};

        expect(content?.toLowerCase()).toContain('failure');
      });
    });

    describe('workflow_yaml_concepts', () => {
      const getYamlConceptsContent = () =>
        skill.referencedContent?.find((r) => r.name === 'workflow-yaml-concepts');

      it('exists', () => {
        expect(getYamlConceptsContent()).toBeDefined();
      });

      it('has non-empty content', () => {
        expect(getYamlConceptsContent()?.content.length).toBeGreaterThan(0);
      });

      it('describes Liquid templating syntax', () => {
        const { content } = getYamlConceptsContent() ?? {};

        expect(content).toContain('Liquid');
      });

      it('mentions timeouts', () => {
        const { content } = getYamlConceptsContent() ?? {};

        expect(content?.toLowerCase()).toContain('timeout');
      });

      it('mentions error propagation', () => {
        const { content } = getYamlConceptsContent() ?? {};

        expect(content?.toLowerCase()).toContain('error');
      });
    });

    describe('pre_execution_failure_patterns', () => {
      const getPreExecutionContent = () =>
        skill.referencedContent?.find((r) => r.name === 'pre-execution-failure-patterns');

      it('exists', () => {
        expect(getPreExecutionContent()).toBeDefined();
      });

      it('has non-empty content', () => {
        expect(getPreExecutionContent()?.content.length).toBeGreaterThan(0);
      });

      it('mentions the health check tool', () => {
        const { content } = getPreExecutionContent() ?? {};

        expect(content).toContain(GET_WORKFLOW_HEALTH_CHECK_TOOL_ID);
      });

      it('describes failure keywords', () => {
        const { content } = getPreExecutionContent() ?? {};

        expect(content).toContain('not enabled');
        expect(content).toContain('not found');
        expect(content).toContain('not valid');
      });
    });

    describe('expanded_error_categories', () => {
      const getExpandedErrorCategoriesContent = () =>
        skill.referencedContent?.find((r) => r.name === 'expanded-error-categories');

      it('exists', () => {
        expect(getExpandedErrorCategoriesContent()).toBeDefined();
      });

      it('includes a false-positive guard for permission_error', () => {
        const { content } = getExpandedErrorCategoriesContent() ?? {};

        expect(content).toContain('False-positive guard');
      });

      it('warns that timeouts are not permission errors', () => {
        const { content } = getExpandedErrorCategoriesContent() ?? {};

        expect(content).toContain('Not a permission issue');
      });
    });
  });

  describe('getRegistryTools', () => {
    it('returns the expected registry tools', async () => {
      const tools = await skill.getRegistryTools?.();

      expect(tools).toEqual(
        expect.arrayContaining([
          platformCoreTools.getWorkflowExecutionStatus,
          VALIDATE_WORKFLOW_TOOL_ID,
          GET_STEP_DEFINITIONS_TOOL_ID,
        ])
      );
    });

    it('returns exactly 3 registry tools', async () => {
      const tools = await skill.getRegistryTools?.();

      expect(tools).toHaveLength(3);
    });

    it('does not exceed the maximum of 7 tools', async () => {
      const tools = (await skill.getRegistryTools?.()) ?? [];

      expect(tools.length).toBeLessThanOrEqual(7);
    });
  });

  describe('getInlineTools', () => {
    it('returns two inline tools', async () => {
      const tools = await skill.getInlineTools?.();

      expect(tools).toHaveLength(2);
    });

    it('returns the get_execution_summary tool', async () => {
      const tools = await skill.getInlineTools?.();

      expect(tools?.find((t) => t.id === GET_EXECUTION_SUMMARY_TOOL_ID)).toBeDefined();
    });

    it('returns the get_workflow_health_check tool', async () => {
      const tools = await skill.getInlineTools?.();

      expect(tools?.find((t) => t.id === GET_WORKFLOW_HEALTH_CHECK_TOOL_ID)).toBeDefined();
    });

    it('returns builtin tool types', async () => {
      const tools = await skill.getInlineTools?.();

      expect(tools?.every((t) => t.type === ToolType.builtin)).toBe(true);
    });

    it('does not exceed the maximum of 7 inline tools', async () => {
      const tools = (await skill.getInlineTools?.()) ?? [];

      expect(tools.length).toBeLessThanOrEqual(7);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowDetailDto, WorkflowYaml } from '@kbn/workflows';
import { validateWorkflowExecutable } from './validate_workflow_executable';

describe('validateWorkflowExecutable', () => {
  const workflowId = 'test-workflow';

  const createWorkflowDefinition = (): WorkflowYaml => ({
    enabled: true,
    name: 'Test Workflow Definition',
    steps: [
      {
        name: 'noop',
        type: 'data.set',
        with: {},
      },
    ],
    triggers: [{ type: 'manual' }],
    version: '1',
  });

  const createValidWorkflow = (): WorkflowDetailDto => ({
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'test-user',
    definition: createWorkflowDefinition(),
    enabled: true,
    id: workflowId,
    lastUpdatedAt: '2026-01-01T00:00:00.000Z',
    lastUpdatedBy: 'test-user',
    name: 'Test Workflow',
    valid: true,
    yaml: 'name: test',
  });

  describe('returns executable: true', () => {
    it('when workflow is valid, enabled, and has a definition', () => {
      const workflow = createValidWorkflow();

      const result = validateWorkflowExecutable(workflow, workflowId);

      expect(result).toEqual({
        executable: true,
        workflow,
      });
    });

    it('when workflow has all required properties and no optional reason', () => {
      const workflow = createValidWorkflow();

      const result = validateWorkflowExecutable(workflow, workflowId);

      expect(result).toEqual({
        executable: true,
        workflow,
      });
    });
  });

  describe('returns executable: false', () => {
    it('when workflow is null', () => {
      const result = validateWorkflowExecutable(null, workflowId);

      expect(result).toEqual({
        executable: false,
        reason: `Workflow '${workflowId}' not found`,
      });
    });

    it('when workflow is not valid', () => {
      const workflow = {
        ...createValidWorkflow(),
        valid: false,
      };

      const result = validateWorkflowExecutable(workflow, workflowId);

      expect(result).toEqual({
        executable: false,
        reason: `Workflow '${workflowId}' is not valid`,
      });
    });

    it('when workflow is missing a definition', () => {
      const workflow = {
        ...createValidWorkflow(),
        definition: null,
      };

      const result = validateWorkflowExecutable(workflow, workflowId);

      expect(result).toEqual({
        executable: false,
        reason: `Workflow '${workflowId}' is missing a definition`,
      });
    });

    it('when workflow is disabled', () => {
      const workflow = {
        ...createValidWorkflow(),
        enabled: false,
      };

      const result = validateWorkflowExecutable(workflow, workflowId);

      expect(result).toEqual({
        executable: false,
        reason: `Workflow '${workflowId}' is disabled`,
      });
    });
  });

  describe('validation order (fail fast)', () => {
    it('returns "not found" before checking other properties when workflow is null', () => {
      const result = validateWorkflowExecutable(null, workflowId);

      expect(result.executable ? '' : result.reason).toContain('not found');
    });

    it('returns "not valid" before checking definition or enabled when workflow is invalid', () => {
      const workflow = {
        ...createValidWorkflow(),
        definition: null,
        enabled: false,
        valid: false,
      };

      const result = validateWorkflowExecutable(workflow, workflowId);

      expect(result.executable ? '' : result.reason).toContain('not valid');
    });

    it('returns "missing a definition" before checking enabled when definition is missing', () => {
      const workflow = {
        ...createValidWorkflow(),
        definition: null,
        enabled: false,
      };

      const result = validateWorkflowExecutable(workflow, workflowId);

      expect(result.executable ? '' : result.reason).toContain('missing a definition');
    });

    it('returns "disabled" only when all other validations pass', () => {
      const workflow = {
        ...createValidWorkflow(),
        enabled: false,
      };

      const result = validateWorkflowExecutable(workflow, workflowId);

      expect(result.executable ? '' : result.reason).toContain('disabled');
    });
  });

  describe('includes workflow ID in reason', () => {
    it('for not found error', () => {
      const customWorkflowId = 'my-custom-workflow';

      const result = validateWorkflowExecutable(null, customWorkflowId);

      expect(result.executable ? '' : result.reason).toContain(customWorkflowId);
    });

    it('for not valid error', () => {
      const customWorkflowId = 'my-custom-workflow';
      const workflow = {
        ...createValidWorkflow(),
        id: customWorkflowId,
        valid: false,
      };

      const result = validateWorkflowExecutable(workflow, customWorkflowId);

      expect(result.executable ? '' : result.reason).toContain(customWorkflowId);
    });

    it('for missing definition error', () => {
      const customWorkflowId = 'my-custom-workflow';
      const workflow = {
        ...createValidWorkflow(),
        definition: null,
        id: customWorkflowId,
      };

      const result = validateWorkflowExecutable(workflow, customWorkflowId);

      expect(result.executable ? '' : result.reason).toContain(customWorkflowId);
    });

    it('for disabled error', () => {
      const customWorkflowId = 'my-custom-workflow';
      const workflow = {
        ...createValidWorkflow(),
        enabled: false,
        id: customWorkflowId,
      };

      const result = validateWorkflowExecutable(workflow, customWorkflowId);

      expect(result.executable ? '' : result.reason).toContain(customWorkflowId);
    });
  });
});

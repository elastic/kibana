/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import type { AggregatedWorkflowExecution, StepExecutionWithLink } from '../../../../types';
import { classifyFailure } from '.';

const emptyExecution: AggregatedWorkflowExecution = {
  status: ExecutionStatus.FAILED,
  steps: [],
};

const makeFailedAlertRetrievalStep = (workflowId: string): StepExecutionWithLink => ({
  globalExecutionIndex: 0,
  id: `failed-step-${workflowId}`,
  pipelinePhase: 'retrieve_alerts',
  scopeStack: [],
  startedAt: '',
  status: ExecutionStatus.FAILED,
  stepExecutionIndex: 0,
  stepId: 'retrieve_alerts',
  topologicalIndex: 0,
  workflowId,
  workflowRunId: `custom-alert-retrieval-${workflowId}-execution-uuid`,
});

describe('classifyFailure', () => {
  describe('workflow_disabled', () => {
    it('classifies "Alert retrieval workflow is not enabled" reason', () => {
      const result = classifyFailure(
        'Alert retrieval workflow is not enabled: wf-abc-123',
        emptyExecution
      );

      expect(result.category).toBe('workflow_disabled');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].linkType).toBe('workflow_editor');
      expect(result.actions[0].workflowId).toBe('wf-abc-123');
      expect(result.summary).toBeTruthy();
    });

    it('classifies "Workflow \'wf-id\' is disabled" reason', () => {
      const result = classifyFailure("Workflow 'wf-disabled-456' is disabled", emptyExecution);

      expect(result.category).toBe('workflow_disabled');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].linkType).toBe('workflow_editor');
      expect(result.actions[0].workflowId).toBe('wf-disabled-456');
    });

    it('includes a non-empty label for the action', () => {
      const result = classifyFailure(
        'Alert retrieval workflow is not enabled: wf-abc',
        emptyExecution
      );

      expect(result.actions[0].label).toBeTruthy();
    });
  });

  describe('workflow_deleted', () => {
    it('classifies "Workflow \'wf-id\' not found" reason', () => {
      const result = classifyFailure("Workflow 'wf-deleted-789' not found", emptyExecution);

      expect(result.category).toBe('workflow_deleted');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].linkType).toBe('attack_discovery_settings');
      expect(result.actions[0].workflowId).toBeUndefined();
      expect(result.summary).toBeTruthy();
    });

    it('includes a non-empty label for the action', () => {
      const result = classifyFailure("Workflow 'wf-id' not found", emptyExecution);

      expect(result.actions[0].label).toBeTruthy();
    });
  });

  describe('workflow_invalid', () => {
    it('classifies "Workflow \'wf-id\' is not valid" reason', () => {
      const result = classifyFailure("Workflow 'wf-invalid-321' is not valid", emptyExecution);

      expect(result.category).toBe('workflow_invalid');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].linkType).toBe('workflow_editor');
      expect(result.actions[0].workflowId).toBe('wf-invalid-321');
      expect(result.summary).toBeTruthy();
    });

    it('classifies "Workflow \'wf-id\' is missing a definition" reason', () => {
      const result = classifyFailure(
        "Workflow 'wf-nodef-654' is missing a definition",
        emptyExecution
      );

      expect(result.category).toBe('workflow_invalid');
      expect(result.actions[0].workflowId).toBe('wf-nodef-654');
    });
  });

  describe('connector_error', () => {
    it('classifies connector error reason', () => {
      const result = classifyFailure('Connector not found: my-connector-id', emptyExecution);

      expect(result.category).toBe('connector_error');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].linkType).toBe('connector_management');
      expect(result.actions[0].workflowId).toBeUndefined();
      expect(result.summary).toBeTruthy();
    });

    it('includes a non-empty label for the action', () => {
      const result = classifyFailure('Connector failed to execute', emptyExecution);

      expect(result.actions[0].label).toBeTruthy();
    });
  });

  describe('timeout', () => {
    it('classifies timeout reason', () => {
      const result = classifyFailure('Request timed out after 30s', emptyExecution);

      expect(result.category).toBe('timeout');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].linkType).toBe('workflow_editor');
      expect(result.summary).toBeTruthy();
    });

    it('includes workflowId in timeout action when extractable from reason', () => {
      const result = classifyFailure("Workflow 'wf-timeout-id' timed out", emptyExecution);

      expect(result.category).toBe('timeout');
      expect(result.actions[0].workflowId).toBe('wf-timeout-id');
    });
  });

  describe('rate_limit', () => {
    it('classifies rate limit reason with no actions', () => {
      const result = classifyFailure('HTTP 429 Too Many Requests', emptyExecution);

      expect(result.category).toBe('rate_limit');
      expect(result.actions).toHaveLength(0);
      expect(result.summary).toBeTruthy();
    });
  });

  describe('network_error', () => {
    it('classifies network error reason with no actions', () => {
      const result = classifyFailure('connect ECONNREFUSED 127.0.0.1:9200', emptyExecution);

      expect(result.category).toBe('network_error');
      expect(result.actions).toHaveLength(0);
      expect(result.summary).toBeTruthy();
    });
  });

  describe('permission_error', () => {
    it('classifies permission error reason with no actions', () => {
      const result = classifyFailure('403 Forbidden', emptyExecution);

      expect(result.category).toBe('permission_error');
      expect(result.actions).toHaveLength(0);
      expect(result.summary).toBeTruthy();
    });
  });

  describe('concurrent_conflict', () => {
    it('classifies concurrent conflict reason with no actions', () => {
      const result = classifyFailure('version_conflict_engine_exception', emptyExecution);

      expect(result.category).toBe('concurrent_conflict');
      expect(result.actions).toHaveLength(0);
      expect(result.summary).toBeTruthy();
    });
  });

  describe('cluster_health', () => {
    it('classifies cluster health reason with no actions', () => {
      const result = classifyFailure('no_shard_available_action_exception', emptyExecution);

      expect(result.category).toBe('cluster_health');
      expect(result.actions).toHaveLength(0);
      expect(result.summary).toBeTruthy();
    });
  });

  describe('anonymization_error', () => {
    it('classifies anonymization error reason with no actions', () => {
      const result = classifyFailure('anonymization pipeline failed', emptyExecution);

      expect(result.category).toBe('anonymization_error');
      expect(result.actions).toHaveLength(0);
      expect(result.summary).toBeTruthy();
    });
  });

  describe('step_registration_error', () => {
    it('classifies step registration error reason with no actions', () => {
      const result = classifyFailure('step type is not registered', emptyExecution);

      expect(result.category).toBe('step_registration_error');
      expect(result.actions).toHaveLength(0);
      expect(result.summary).toBeTruthy();
    });
  });

  describe('validation_error', () => {
    it('classifies validation error reason with no actions', () => {
      const result = classifyFailure('Validation failed: invalid schema', emptyExecution);

      expect(result.category).toBe('validation_error');
      expect(result.actions).toHaveLength(0);
      expect(result.summary).toBeTruthy();
    });
  });

  describe('workflow_error', () => {
    it('classifies generic workflow error reason with no actions', () => {
      const result = classifyFailure('Workflow execution failed', emptyExecution);

      expect(result.category).toBe('workflow_error');
      expect(result.actions).toHaveLength(0);
      expect(result.summary).toBeTruthy();
    });
  });

  describe('unknown', () => {
    it('classifies unknown reason with no actions', () => {
      const result = classifyFailure('Something went wrong', emptyExecution);

      expect(result.category).toBe('unknown');
      expect(result.actions).toHaveLength(0);
      expect(result.summary).toBeTruthy();
    });

    it('handles empty reason string', () => {
      const result = classifyFailure('', emptyExecution);

      expect(result.category).toBe('unknown');
      expect(result.actions).toHaveLength(0);
    });
  });

  describe('workflowId extraction', () => {
    it('extracts workflowId from "Workflow \'id\' is disabled" pattern', () => {
      const result = classifyFailure("Workflow 'my-wf-id' is disabled", emptyExecution);

      expect(result.actions[0].workflowId).toBe('my-wf-id');
    });

    it('extracts workflowId from "is not enabled: id" pattern', () => {
      const result = classifyFailure(
        'Alert retrieval workflow is not enabled: my-retrieval-wf',
        emptyExecution
      );

      expect(result.actions[0].workflowId).toBe('my-retrieval-wf');
    });

    it('strips trailing parentheses from workflowId extracted via "is not enabled" pattern', () => {
      const result = classifyFailure(
        'Alert retrieval workflow is not enabled: workflow-25939289-542d-4725-8fa5-b1e856feb0b7)',
        emptyExecution
      );

      expect(result.actions[0].workflowId).toBe('workflow-25939289-542d-4725-8fa5-b1e856feb0b7');
    });

    it('extracts workflowId from failed alert retrieval placeholder step in aggregatedExecution', () => {
      const disabledWorkflowId = 'workflow-25939289-542d-4725-8fa5-b1e856feb0b7';
      const executionWithFailedStep: AggregatedWorkflowExecution = {
        status: ExecutionStatus.FAILED,
        steps: [makeFailedAlertRetrievalStep(disabledWorkflowId)],
      };

      const result = classifyFailure(
        "1 custom alert retrieval workflow(s) failed: workflow-25939289-542d-4725-8fa5-b1e856feb0b7 (Alert retrieval workflow 'Attack discovery - Closed alerts ES|QL retrieval (Test)' (id: workflow-25939289-542d-4725-8fa5-b1e856feb0b7) is not enabled. Enable it in the Workflows UI to resume generation.)",
        executionWithFailedStep
      );

      expect(result.category).toBe('workflow_disabled');
      expect(result.actions[0].workflowId).toBe(disabledWorkflowId);
    });

    it('prefers workflowId from aggregatedExecution steps over the reason string', () => {
      const structuredWorkflowId = 'wf-from-structured-data';
      const executionWithFailedStep: AggregatedWorkflowExecution = {
        status: ExecutionStatus.FAILED,
        steps: [makeFailedAlertRetrievalStep(structuredWorkflowId)],
      };

      // The reason string contains a different (wrong) workflow id pattern
      const result = classifyFailure(
        'Alert retrieval workflow is not enabled: wf-from-reason-string',
        executionWithFailedStep
      );

      expect(result.actions[0].workflowId).toBe(structuredWorkflowId);
    });

    it('does not include workflowId when it cannot be extracted from connector error', () => {
      const result = classifyFailure('Connector failed', emptyExecution);

      expect(result.actions[0].workflowId).toBeUndefined();
    });

    it('omits workflowId from workflow_disabled action when reason has no extractable id', () => {
      // A custom "is disabled" message that doesn't match known patterns
      const result = classifyFailure('the feature is disabled', emptyExecution);

      // "is disabled" → workflow_disabled, but no workflowId extractable
      expect(result.category).toBe('workflow_disabled');
      expect(result.actions[0].workflowId).toBeUndefined();
    });

    it('omits workflowId from timeout action when reason has no extractable id', () => {
      const result = classifyFailure('operation timed out', emptyExecution);

      expect(result.category).toBe('timeout');
      expect(result.actions[0].workflowId).toBeUndefined();
    });

    it('omits workflowId from workflow_invalid action when reason has no extractable id', () => {
      // Matches "is not valid" but has no quoted workflow id
      const result = classifyFailure('the configuration is not valid', emptyExecution);

      expect(result.category).toBe('workflow_invalid');
      expect(result.actions[0].workflowId).toBeUndefined();
    });
  });

  describe('FailureClassification shape', () => {
    it('always returns actions, category, and summary', () => {
      const result = classifyFailure('Some error', emptyExecution);

      expect(result).toHaveProperty('actions');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('summary');
      expect(Array.isArray(result.actions)).toBe(true);
      expect(typeof result.category).toBe('string');
      expect(typeof result.summary).toBe('string');
    });
  });

  describe('serverErrorCategory override', () => {
    it('uses server-provided errorCategory instead of regex classification', () => {
      // reason would normally classify as 'unknown', but server says 'rate_limit'
      const result = classifyFailure('Something unexpected happened', emptyExecution, 'rate_limit');

      expect(result.category).toBe('rate_limit');
    });

    it('uses server-provided errorCategory for summary lookup', () => {
      const result = classifyFailure('Something unexpected happened', emptyExecution, 'timeout');

      expect(result.summary).toMatch(/timed out/i);
    });

    it('falls back to regex classification when serverErrorCategory is absent', () => {
      const result = classifyFailure('HTTP 429 Too Many Requests', emptyExecution);

      expect(result.category).toBe('rate_limit');
    });

    it('falls back to regex classification when serverErrorCategory is undefined', () => {
      const result = classifyFailure('HTTP 429 Too Many Requests', emptyExecution, undefined);

      expect(result.category).toBe('rate_limit');
    });
  });

  describe('serverWorkflowId override', () => {
    it('uses server-provided workflowId for workflow_disabled action', () => {
      const result = classifyFailure(
        'Alert retrieval workflow is not enabled: wrong-wf-id',
        emptyExecution,
        'workflow_disabled',
        'server-provided-wf-id'
      );

      expect(result.actions[0].workflowId).toBe('server-provided-wf-id');
    });

    it('uses server-provided workflowId for workflow_invalid action', () => {
      const result = classifyFailure(
        "Workflow 'wrong-wf-id' is not valid",
        emptyExecution,
        'workflow_invalid',
        'server-wf-id'
      );

      expect(result.actions[0].workflowId).toBe('server-wf-id');
    });

    it('uses server-provided workflowId for timeout action', () => {
      const result = classifyFailure(
        'Request timed out',
        emptyExecution,
        'timeout',
        'server-wf-id'
      );

      expect(result.actions[0].workflowId).toBe('server-wf-id');
    });

    it('falls back to extracting workflowId from reason when serverWorkflowId is absent', () => {
      const result = classifyFailure(
        'Alert retrieval workflow is not enabled: reason-wf-id',
        emptyExecution,
        'workflow_disabled'
      );

      expect(result.actions[0].workflowId).toBe('reason-wf-id');
    });

    it('falls back to extracting workflowId from reason when serverWorkflowId is undefined', () => {
      const result = classifyFailure(
        'Alert retrieval workflow is not enabled: reason-wf-id',
        emptyExecution,
        'workflow_disabled',
        undefined
      );

      expect(result.actions[0].workflowId).toBe('reason-wf-id');
    });

    it('prefers serverWorkflowId over workflowId from aggregatedExecution steps', () => {
      const executionWithFailedStep: AggregatedWorkflowExecution = {
        status: ExecutionStatus.FAILED,
        steps: [makeFailedAlertRetrievalStep('step-wf-id')],
      };

      const result = classifyFailure(
        'Alert retrieval workflow is not enabled: reason-wf-id',
        executionWithFailedStep,
        'workflow_disabled',
        'server-wins-wf-id'
      );

      expect(result.actions[0].workflowId).toBe('server-wins-wf-id');
    });
  });
});

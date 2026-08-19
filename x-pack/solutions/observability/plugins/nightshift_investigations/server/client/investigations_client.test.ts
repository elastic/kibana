/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';
import { SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  InvestigationNotFoundError,
  NightshiftInvestigationsClient,
} from './investigations_client';

const SPACE_ID = 'test-space';

const mockManagement = {
  getWorkflowExecution: jest.fn(),
  getWorkflow: jest.fn(),
  runWorkflow: jest.fn(),
  getWorkflowExecutions: jest.fn(),
};

const mockWorkflowsManagement = {
  management: mockManagement,
} as unknown as WorkflowsServerPluginSetup;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

const mockRequest = {} as KibanaRequest;

const makeExecution = (overrides: Record<string, unknown> = {}) => ({
  workflowId: SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
  status: ExecutionStatus.RUNNING,
  startedAt: '2024-01-01T00:00:00Z',
  finishedAt: undefined as string | undefined,
  context: undefined as Record<string, unknown> | undefined,
  stepExecutions: undefined as Array<{ output: unknown }> | undefined,
  error: undefined as { message: string } | undefined,
  ...overrides,
});

const makeClient = () =>
  new NightshiftInvestigationsClient(
    mockRequest,
    mockWorkflowsManagement,
    undefined,
    mockLogger,
    SPACE_ID
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NightshiftInvestigationsClient.get()', () => {
  describe('not-found guards', () => {
    it('throws InvestigationNotFoundError when execution is null', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(null);
      await expect(makeClient().get('inv-123')).rejects.toThrow(InvestigationNotFoundError);
      await expect(makeClient().get('inv-123')).rejects.toThrow('"inv-123" not found');
    });

    it('throws InvestigationNotFoundError when workflowId does not match', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({ workflowId: 'some-other-workflow' })
      );
      await expect(makeClient().get('inv-123')).rejects.toThrow(InvestigationNotFoundError);
    });
  });

  describe('status mapping', () => {
    const cases: Array<[ExecutionStatus, string]> = [
      [ExecutionStatus.PENDING, 'pending'],
      [ExecutionStatus.QUEUED, 'pending'],
      [ExecutionStatus.RUNNING, 'running'],
      [ExecutionStatus.WAITING, 'running'],
      [ExecutionStatus.WAITING_FOR_INPUT, 'running'],
      [ExecutionStatus.WAITING_FOR_CHILD, 'running'],
      [ExecutionStatus.COMPLETED, 'completed'],
      [ExecutionStatus.FAILED, 'failed'],
      [ExecutionStatus.TIMED_OUT, 'failed'],
      [ExecutionStatus.CANCELLED, 'cancelled'],
      [ExecutionStatus.SKIPPED, 'cancelled'],
    ];

    it.each(cases)('%s → %s', async (executionStatus, expectedStatus) => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({ status: executionStatus })
      );
      const result = await makeClient().get('inv-1');
      expect(result.status).toBe(expectedStatus);
    });

    it('unknown status defaults to running and logs a warning', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({ status: 'totally-unknown' as ExecutionStatus })
      );
      const result = await makeClient().get('inv-1');
      expect(result.status).toBe('running');
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('totally-unknown'));
    });
  });

  describe('subject recovery', () => {
    it('recovers significant_event subject from context.inputs', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          context: {
            inputs: { context: { source: 'significant_event', significant_event_id: 'se-42' } },
          },
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.subject).toEqual({ type: 'significant_event', id: 'se-42' });
    });

    it('recovers alert subject from context.inputs', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          context: { inputs: { context: { source: 'alert', alert_id: 'alert-99' } } },
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.subject).toEqual({ type: 'alert', id: 'alert-99' });
    });

    it('falls back to empty significant_event when context is missing', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(makeExecution());
      const result = await makeClient().get('inv-1');
      expect(result.subject).toEqual({ type: 'significant_event', id: '' });
    });
  });

  describe('terminal state handling', () => {
    it('sets completed_at when status is completed', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({ status: ExecutionStatus.COMPLETED, finishedAt: '2024-01-02T00:00:00Z' })
      );
      const result = await makeClient().get('inv-1');
      expect(result.completed_at).toBe('2024-01-02T00:00:00Z');
    });

    it('does not set completed_at when status is running', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({ status: ExecutionStatus.RUNNING, finishedAt: '2024-01-02T00:00:00Z' })
      );
      const result = await makeClient().get('inv-1');
      expect(result.completed_at).toBeUndefined();
    });
  });

  describe('conclusions', () => {
    // The workflow engine wraps ai.agent structured output in a `structured_output` envelope.
    // Real shape: stepExecution.output = { structured_output: { conclusion: '...', summary: '...' } }
    // Confirmed by investigation_workflow.yaml: steps.investigate.output.structured_output.*

    it('returns conclusion from the last step whose structured_output has a conclusion field', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [
            { output: { structured_output: { conclusion: 'All clear.', summary: 'Summary.' } } },
            { output: { other: 'data' } }, // non-agent step — no structured_output
          ],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.conclusions).toBe('All clear.');
    });

    it('prefers the last step with structured_output when multiple steps have it', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [
            { output: { structured_output: { conclusion: 'First conclusion.' } } },
            { output: { structured_output: { conclusion: 'Last conclusion.' } } },
          ],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.conclusions).toBe('Last conclusion.');
    });

    it('falls back to summary when structured_output has summary but no conclusion', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [{ output: { structured_output: { summary: 'Summary text.' } } }],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.conclusions).toBe('Summary text.');
    });

    it('does not match steps whose output has conclusion at the top level (old/wrong shape)', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [{ output: { conclusion: 'Flat — should not match.' } }],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.conclusions).toBeUndefined();
    });

    it('returns undefined when no step has structured_output', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [{ output: { other: 'data' } }],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.conclusions).toBeUndefined();
    });

    it('does not return conclusions when status is not completed', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.RUNNING,
          stepExecutions: [{ output: { structured_output: { conclusion: 'Should be ignored.' } } }],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.conclusions).toBeUndefined();
    });
  });

  describe('error masking', () => {
    it('returns generic error string (not raw message) when failed', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.FAILED,
          error: { message: 'Internal credential error: secret-token-xyz' },
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.error).toBe('Investigation failed');
      expect(result.error).not.toContain('secret-token-xyz');
    });

    it('does not set error when status is not failed', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({ status: ExecutionStatus.COMPLETED })
      );
      const result = await makeClient().get('inv-1');
      expect(result.error).toBeUndefined();
    });
  });
});

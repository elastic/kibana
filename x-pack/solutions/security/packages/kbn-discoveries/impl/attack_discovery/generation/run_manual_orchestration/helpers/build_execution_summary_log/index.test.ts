/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildExecutionSummaryLog, type BuildExecutionSummaryLogParams } from '.';

const defaultParams: BuildExecutionSummaryLogParams = {
  alertsContextCount: 50,
  basePath: '',
  persistedCount: 3,
  generationStep: {
    durationMs: 6000,
    executions: [{ workflowId: 'gen-wf-id', workflowRunId: 'gen-run-id' }],
    status: 'succeeded',
  },
  retrievalStep: {
    durationMs: 4500,
    executions: [{ workflowId: 'ret-wf-id', workflowRunId: 'ret-run-id' }],
    status: 'succeeded',
  },
  totalDurationMs: 12345,
  validationStep: {
    durationMs: 1800,
    executions: [{ workflowId: 'val-wf-id', workflowRunId: 'val-run-id' }],
    status: 'succeeded',
  },
};

describe('buildExecutionSummaryLog', () => {
  it('returns a string', () => {
    const result = buildExecutionSummaryLog(defaultParams);

    expect(typeof result).toBe('string');
  });

  describe('header', () => {
    it('includes the overall outcome "succeeded" when all steps succeed', () => {
      const result = buildExecutionSummaryLog(defaultParams);

      expect(result).toContain('[succeeded]');
    });

    it('includes the overall outcome "failed" when retrieval fails', () => {
      const result = buildExecutionSummaryLog({
        ...defaultParams,
        retrievalStep: {
          durationMs: 100,
          error: 'retrieval boom',
          executions: [],
          status: 'failed',
        },
      });

      expect(result).toContain('[failed]');
    });

    it('includes the overall outcome "failed" when generation fails', () => {
      const result = buildExecutionSummaryLog({
        ...defaultParams,
        generationStep: {
          durationMs: 200,
          error: 'generation boom',
          executions: [],
          status: 'failed',
        },
      });

      expect(result).toContain('[failed]');
    });

    it('includes the overall outcome "failed" when validation fails', () => {
      const result = buildExecutionSummaryLog({
        ...defaultParams,
        validationStep: {
          durationMs: 300,
          executions: [],
          status: 'failed',
        },
      });

      expect(result).toContain('[failed]');
    });

    it('includes the total duration', () => {
      const result = buildExecutionSummaryLog(defaultParams);

      expect(result).toContain('12345ms');
    });

    it('includes the alerts context count', () => {
      const result = buildExecutionSummaryLog(defaultParams);

      expect(result).toContain('alerts: 50');
    });

    it('includes the discovery count', () => {
      const result = buildExecutionSummaryLog(defaultParams);

      expect(result).toContain('discoveries: 3');
    });
  });

  describe('retrieval step', () => {
    it('includes retrieval status and duration', () => {
      const result = buildExecutionSummaryLog(defaultParams);

      expect(result).toContain('retrieval: succeeded (4500ms)');
    });

    it('includes a workflow link for the retrieval execution', () => {
      const result = buildExecutionSummaryLog(defaultParams);

      expect(result).toContain('/app/workflows/ret-wf-id?tab=executions&executionId=ret-run-id');
    });

    it('includes the retrieval workflow ID', () => {
      const result = buildExecutionSummaryLog(defaultParams);

      expect(result).toContain('[ret-wf-id]');
    });

    it('includes links for multiple retrieval executions', () => {
      const result = buildExecutionSummaryLog({
        ...defaultParams,
        retrievalStep: {
          durationMs: 4500,
          executions: [
            { workflowId: 'default-ret', workflowRunId: 'default-run' },
            { workflowId: 'custom-ret', workflowRunId: 'custom-run' },
          ],
          status: 'succeeded',
        },
      });

      expect(result).toContain('/app/workflows/default-ret?tab=executions&executionId=default-run');
      expect(result).toContain('/app/workflows/custom-ret?tab=executions&executionId=custom-run');
    });

    it('shows error message when retrieval fails', () => {
      const result = buildExecutionSummaryLog({
        ...defaultParams,
        retrievalStep: {
          durationMs: 100,
          error: 'retrieval boom',
          executions: [],
          status: 'failed',
        },
      });

      expect(result).toContain('retrieval: failed (100ms)');
      expect(result).toContain('retrieval boom');
    });
  });

  describe('generation step', () => {
    it('includes generation status and duration', () => {
      const result = buildExecutionSummaryLog(defaultParams);

      expect(result).toContain('generation: succeeded (6000ms)');
    });

    it('includes a workflow link for the generation execution', () => {
      const result = buildExecutionSummaryLog(defaultParams);

      expect(result).toContain('/app/workflows/gen-wf-id?tab=executions&executionId=gen-run-id');
    });

    it('shows "not started" when generation was not reached', () => {
      const result = buildExecutionSummaryLog({
        ...defaultParams,
        generationStep: {
          durationMs: 0,
          executions: [],
          status: 'not_started',
        },
      });

      expect(result).toContain('generation: not started');
    });

    it('shows error message when generation fails', () => {
      const result = buildExecutionSummaryLog({
        ...defaultParams,
        generationStep: {
          durationMs: 500,
          error: 'generation boom',
          executions: [],
          status: 'failed',
        },
      });

      expect(result).toContain('generation: failed (500ms)');
      expect(result).toContain('generation boom');
    });
  });

  describe('validation step', () => {
    it('includes validation status and duration', () => {
      const result = buildExecutionSummaryLog(defaultParams);

      expect(result).toContain('validation: succeeded (1800ms)');
    });

    it('includes a workflow link for the validation execution', () => {
      const result = buildExecutionSummaryLog(defaultParams);

      expect(result).toContain('/app/workflows/val-wf-id?tab=executions&executionId=val-run-id');
    });

    it('shows "not started" when validation was not reached', () => {
      const result = buildExecutionSummaryLog({
        ...defaultParams,
        validationStep: {
          durationMs: 0,
          executions: [],
          status: 'not_started',
        },
      });

      expect(result).toContain('validation: not started');
    });
  });

  describe('basePath', () => {
    it('prepends basePath to workflow links', () => {
      const result = buildExecutionSummaryLog({
        ...defaultParams,
        basePath: '/s/my-space',
      });

      expect(result).toContain(
        '/s/my-space/app/workflows/ret-wf-id?tab=executions&executionId=ret-run-id'
      );
      expect(result).toContain(
        '/s/my-space/app/workflows/gen-wf-id?tab=executions&executionId=gen-run-id'
      );
      expect(result).toContain(
        '/s/my-space/app/workflows/val-wf-id?tab=executions&executionId=val-run-id'
      );
    });

    it('handles empty basePath for default space', () => {
      const result = buildExecutionSummaryLog({
        ...defaultParams,
        basePath: '',
      });

      expect(result).toContain('/app/workflows/ret-wf-id?tab=executions&executionId=ret-run-id');
    });

    it('handles basePath with server base path', () => {
      const result = buildExecutionSummaryLog({
        ...defaultParams,
        basePath: '/custom-base/s/test-space',
      });

      expect(result).toContain(
        '/custom-base/s/test-space/app/workflows/gen-wf-id?tab=executions&executionId=gen-run-id'
      );
    });
  });

  describe('complete failure scenario', () => {
    it('shows retrieval failed with generation and validation not started', () => {
      const result = buildExecutionSummaryLog({
        ...defaultParams,
        alertsContextCount: 0,
        persistedCount: 0,
        generationStep: {
          durationMs: 0,
          executions: [],
          status: 'not_started',
        },
        retrievalStep: {
          durationMs: 250,
          error: 'no alerts found',
          executions: [],
          status: 'failed',
        },
        totalDurationMs: 300,
        validationStep: {
          durationMs: 0,
          executions: [],
          status: 'not_started',
        },
      });

      expect(result).toContain('[failed]');
      expect(result).toContain('300ms');
      expect(result).toContain('retrieval: failed (250ms)');
      expect(result).toContain('no alerts found');
      expect(result).toContain('generation: not started');
      expect(result).toContain('validation: not started');
    });
  });
});

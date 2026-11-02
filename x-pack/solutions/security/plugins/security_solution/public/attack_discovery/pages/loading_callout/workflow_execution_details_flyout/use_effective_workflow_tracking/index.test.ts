/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { HttpSetup } from '@kbn/core/public';

import { useWorkflowTracking } from '../../../hooks/use_workflow_tracking';
import { useEffectiveWorkflowTracking } from '.';

jest.mock('../../../hooks/use_workflow_tracking');

const mockUseWorkflowTracking = useWorkflowTracking as jest.Mock;

const mockHttp = {} as HttpSetup;

const baseProps = {
  executionUuid: 'exec-123',
  generationStatus: undefined as
    | 'started'
    | 'succeeded'
    | 'failed'
    | 'canceled'
    | 'dismissed'
    | undefined,
  http: mockHttp,
  workflowExecutions: null,
  workflowId: 'workflow-abc',
  workflowRunId: 'run-xyz',
};

describe('useEffectiveWorkflowTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowTracking.mockReturnValue({ data: undefined });
  });

  describe('isTerminalStatus', () => {
    it('returns false when generationStatus is started', () => {
      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, generationStatus: 'started' })
      );

      expect(result.current.isTerminalStatus).toBe(false);
    });

    it('returns false when generationStatus is undefined', () => {
      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, generationStatus: undefined })
      );

      expect(result.current.isTerminalStatus).toBe(false);
    });

    it('returns true when generationStatus is succeeded', () => {
      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, generationStatus: 'succeeded' })
      );

      expect(result.current.isTerminalStatus).toBe(true);
    });

    it('returns true when generationStatus is failed', () => {
      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, generationStatus: 'failed' })
      );

      expect(result.current.isTerminalStatus).toBe(true);
    });

    it('returns true when generationStatus is canceled', () => {
      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, generationStatus: 'canceled' })
      );

      expect(result.current.isTerminalStatus).toBe(true);
    });

    it('returns true when generationStatus is dismissed', () => {
      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, generationStatus: 'dismissed' })
      );

      expect(result.current.isTerminalStatus).toBe(true);
    });
  });

  describe('effectiveWorkflowId', () => {
    it('returns the prop workflowId when no internal tracking data is available', () => {
      mockUseWorkflowTracking.mockReturnValue({ data: undefined });

      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, workflowId: 'prop-workflow' })
      );

      expect(result.current.effectiveWorkflowId).toBe('prop-workflow');
    });

    it('falls back to internal tracking generation workflowId when prop workflowId is null', () => {
      mockUseWorkflowTracking.mockReturnValue({
        data: {
          alert_retrieval: null,
          generation: { workflow_id: 'internal-workflow', workflow_run_id: 'internal-run' },
          validation: null,
        },
      });

      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, workflowId: null })
      );

      expect(result.current.effectiveWorkflowId).toBe('internal-workflow');
    });

    it('returns null when both prop workflowId and internal data are absent', () => {
      mockUseWorkflowTracking.mockReturnValue({ data: undefined });

      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, workflowId: null })
      );

      expect(result.current.effectiveWorkflowId).toBeNull();
    });
  });

  describe('effectiveWorkflowRunId', () => {
    it('returns the prop workflowRunId when it is defined', () => {
      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, workflowRunId: 'prop-run' })
      );

      expect(result.current.effectiveWorkflowRunId).toBe('prop-run');
    });

    it('returns null when prop workflowRunId is explicitly null and no tracking data', () => {
      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, workflowRunId: null })
      );

      expect(result.current.effectiveWorkflowRunId).toBeNull();
    });

    it('uses internal tracking run ID when prop workflowRunId is null and tracking data is available', () => {
      // This covers the "provided" mode during generation: the generation record has
      // workflow_run_id: null initially (no run ID yet), but once the generate-step-started
      // event is indexed, the polling hook supplies the run ID via internalTrackingData.
      mockUseWorkflowTracking.mockReturnValue({
        data: {
          alert_retrieval: null,
          generation: { workflow_id: 'wf', workflow_run_id: 'internal-run-from-tracking' },
          validation: null,
        },
      });

      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, workflowRunId: null })
      );

      expect(result.current.effectiveWorkflowRunId).toBe('internal-run-from-tracking');
    });

    it('falls back to internal tracking run ID when prop workflowRunId is undefined', () => {
      mockUseWorkflowTracking.mockReturnValue({
        data: {
          alert_retrieval: null,
          generation: { workflow_id: 'wf', workflow_run_id: 'internal-run' },
          validation: null,
        },
      });

      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, workflowRunId: undefined })
      );

      expect(result.current.effectiveWorkflowRunId).toBe('internal-run');
    });

    it('returns undefined when prop workflowRunId is undefined and no internal data', () => {
      mockUseWorkflowTracking.mockReturnValue({ data: undefined });

      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, workflowRunId: undefined })
      );

      expect(result.current.effectiveWorkflowRunId).toBeUndefined();
    });
  });

  describe('effectiveWorkflowExecutions merging', () => {
    it('returns prop workflowExecutions when no internal tracking data', () => {
      const propExecutions = {
        alertRetrieval: [{ workflowId: 'wf', workflowRunId: 'run' }],
        generation: null,
        validation: null,
      };

      mockUseWorkflowTracking.mockReturnValue({ data: undefined });

      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, workflowExecutions: propExecutions })
      );

      expect(result.current.effectiveWorkflowExecutions).toBe(propExecutions);
    });

    it('merges internal generation data when props do not provide it', () => {
      mockUseWorkflowTracking.mockReturnValue({
        data: {
          alert_retrieval: null,
          generation: { workflow_id: 'internal-gen', workflow_run_id: 'internal-gen-run' },
          validation: null,
        },
      });

      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, workflowExecutions: null })
      );

      expect(result.current.effectiveWorkflowExecutions?.generation).toEqual({
        workflowId: 'internal-gen',
        workflowRunId: 'internal-gen-run',
      });
    });

    it('prop generation takes priority over internal tracking data', () => {
      mockUseWorkflowTracking.mockReturnValue({
        data: {
          alert_retrieval: null,
          generation: { workflow_id: 'internal-gen', workflow_run_id: 'internal-gen-run' },
          validation: null,
        },
      });

      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({
          ...baseProps,
          workflowExecutions: {
            alertRetrieval: null,
            generation: { workflowId: 'prop-gen', workflowRunId: 'prop-gen-run' },
            validation: null,
          },
        })
      );

      expect(result.current.effectiveWorkflowExecutions?.generation).toEqual({
        workflowId: 'prop-gen',
        workflowRunId: 'prop-gen-run',
      });
    });
  });

  describe('polling control', () => {
    it('passes executionUuid to useWorkflowTracking when not terminal', () => {
      renderHook(() => useEffectiveWorkflowTracking({ ...baseProps, generationStatus: 'started' }));

      expect(mockUseWorkflowTracking).toHaveBeenCalledWith(
        expect.objectContaining({ executionId: 'exec-123' })
      );
    });

    it('passes null executionId to useWorkflowTracking when terminal', () => {
      renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, generationStatus: 'succeeded' })
      );

      expect(mockUseWorkflowTracking).toHaveBeenCalledWith(
        expect.objectContaining({ executionId: null })
      );
    });
  });

  describe('pipelineDataRefetchIntervalMs', () => {
    it('returns 5000 when not terminal', () => {
      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, generationStatus: 'started' })
      );

      expect(result.current.pipelineDataRefetchIntervalMs).toBe(5000);
    });

    it('returns 0 when terminal', () => {
      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, generationStatus: 'succeeded' })
      );

      expect(result.current.pipelineDataRefetchIntervalMs).toBe(0);
    });

    it('returns 5000 when generationStatus is undefined', () => {
      const { result } = renderHook(() =>
        useEffectiveWorkflowTracking({ ...baseProps, generationStatus: undefined })
      );

      expect(result.current.pipelineDataRefetchIntervalMs).toBe(5000);
    });
  });
});

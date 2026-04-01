/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useWorkflowEditorLink } from '.';
import { useKibana } from '../../../common/lib/kibana';

jest.mock('../../../common/lib/kibana');

const mockUseKibana = useKibana as jest.Mock;

describe('useWorkflowEditorLink', () => {
  const mockGetUrlForApp = jest.fn();
  const mockHttpFetch = jest.fn();
  const mockNavigateToApp = jest.fn();
  const mockNavigateToUrl = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          getUrlForApp: mockGetUrlForApp,
          navigateToApp: mockNavigateToApp,
          navigateToUrl: mockNavigateToUrl,
        },
        http: {
          fetch: mockHttpFetch,
        },
      },
    });
  });

  describe('when both workflowId and workflowRunId are provided', () => {
    const workflowId = 'workflow-123';
    const workflowRunId = 'run-456';

    beforeEach(() => {
      mockGetUrlForApp.mockReturnValue(
        '/app/workflows/workflow-123?tab=executions&executionId=run-456'
      );
    });

    it('returns the editor URL', () => {
      const { result } = renderHook(() => useWorkflowEditorLink({ workflowId, workflowRunId }));

      expect(result.current.editorUrl).toBe(
        '/app/workflows/workflow-123?tab=executions&executionId=run-456'
      );
    });

    it('calls getUrlForApp with correct parameters', () => {
      renderHook(() => useWorkflowEditorLink({ workflowId, workflowRunId }));

      expect(mockGetUrlForApp).toHaveBeenCalledWith('workflows', {
        path: '/workflow-123?tab=executions&executionId=run-456',
      });
    });

    it('returns a navigateToEditor callback', () => {
      const { result } = renderHook(() => useWorkflowEditorLink({ workflowId, workflowRunId }));

      expect(typeof result.current.navigateToEditor).toBe('function');
    });

    it('calls navigateToApp with openInNewTab when navigateToEditor is invoked', () => {
      const { result } = renderHook(() => useWorkflowEditorLink({ workflowId, workflowRunId }));

      result.current.navigateToEditor();

      expect(mockNavigateToApp).toHaveBeenCalledWith('workflows', {
        openInNewTab: true,
        path: '/workflow-123?tab=executions&executionId=run-456',
      });
    });
  });

  describe('when workflowId is null', () => {
    it('returns null for editorUrl', () => {
      const { result } = renderHook(() =>
        useWorkflowEditorLink({ workflowId: null, workflowRunId: 'run-456' })
      );

      expect(result.current.editorUrl).toBeNull();
    });

    it('does not call getUrlForApp', () => {
      renderHook(() => useWorkflowEditorLink({ workflowId: null, workflowRunId: 'run-456' }));

      expect(mockGetUrlForApp).not.toHaveBeenCalled();
    });

    it('does not navigate when navigateToEditor is called', () => {
      const { result } = renderHook(() =>
        useWorkflowEditorLink({ workflowId: null, workflowRunId: 'run-456' })
      );

      result.current.navigateToEditor();

      expect(mockNavigateToUrl).not.toHaveBeenCalled();
      expect(mockNavigateToApp).not.toHaveBeenCalled();
    });
  });

  describe('when workflowId is undefined', () => {
    it('returns null for editorUrl', () => {
      const { result } = renderHook(() =>
        useWorkflowEditorLink({ workflowId: undefined, workflowRunId: 'run-456' })
      );

      expect(result.current.editorUrl).toBeNull();
    });
  });

  describe('when workflowRunId is null', () => {
    beforeEach(() => {
      mockGetUrlForApp.mockReturnValue('/app/workflows/workflow-123');
    });

    it('returns the workflow editor URL without the executions tab', () => {
      const { result } = renderHook(() =>
        useWorkflowEditorLink({ workflowId: 'workflow-123', workflowRunId: null })
      );

      expect(result.current.editorUrl).toBe('/app/workflows/workflow-123');
    });

    it('calls getUrlForApp with a path that does NOT include the executions tab', () => {
      renderHook(() => useWorkflowEditorLink({ workflowId: 'workflow-123', workflowRunId: null }));

      expect(mockGetUrlForApp).toHaveBeenCalledWith('workflows', {
        path: '/workflow-123',
      });
    });
  });

  describe('when workflowRunId is undefined', () => {
    beforeEach(() => {
      mockGetUrlForApp.mockReturnValue('/app/workflows/workflow-123');
    });

    it('returns the workflow editor URL without the executions tab', () => {
      const { result } = renderHook(() =>
        useWorkflowEditorLink({ workflowId: 'workflow-123', workflowRunId: undefined })
      );

      expect(result.current.editorUrl).toBe('/app/workflows/workflow-123');
    });
  });

  describe('when both workflowId and workflowRunId are null', () => {
    it('returns null for editorUrl', () => {
      const { result } = renderHook(() =>
        useWorkflowEditorLink({ workflowId: null, workflowRunId: null })
      );

      expect(result.current.editorUrl).toBeNull();
    });

    it('does not navigate when navigateToEditor is called', () => {
      const { result } = renderHook(() =>
        useWorkflowEditorLink({ workflowId: null, workflowRunId: null })
      );

      result.current.navigateToEditor();

      expect(mockNavigateToUrl).not.toHaveBeenCalled();
      expect(mockNavigateToApp).not.toHaveBeenCalled();
    });
  });

  describe('when workflowRunId starts with "stub-"', () => {
    const workflowId = 'workflow-123';
    const stubWorkflowRunId = 'stub-46654f85-2a89-44b7-b942-0726bc56f9d9';

    beforeEach(() => {
      mockGetUrlForApp.mockReturnValue('/app/workflows/workflow-123');
    });

    it('returns the workflow editor URL without the executions tab', () => {
      const { result } = renderHook(() =>
        useWorkflowEditorLink({ workflowId, workflowRunId: stubWorkflowRunId })
      );

      expect(result.current.editorUrl).toBe('/app/workflows/workflow-123');
    });

    it('calls getUrlForApp with a path that does NOT include the executions tab', () => {
      renderHook(() => useWorkflowEditorLink({ workflowId, workflowRunId: stubWorkflowRunId }));

      expect(mockGetUrlForApp).toHaveBeenCalledWith('workflows', {
        path: '/workflow-123',
      });
    });

    it('navigates to the workflow editor when navigateToEditor is called', () => {
      const { result } = renderHook(() =>
        useWorkflowEditorLink({ workflowId, workflowRunId: stubWorkflowRunId })
      );

      result.current.navigateToEditor();

      expect(mockNavigateToApp).toHaveBeenCalledWith('workflows', {
        openInNewTab: true,
        path: '/workflow-123',
      });
    });
  });

  describe('when workflowId is an alias', () => {
    const workflowId = 'attack-discovery-generation';
    const workflowRunId = 'stub-46654f85-2a89-44b7-b942-0726bc56f9d9';

    beforeEach(() => {
      mockHttpFetch.mockResolvedValue({
        results: [{ id: 'workflow-abc' }],
      });
      mockGetUrlForApp.mockReturnValue('/app/workflows/workflow-abc');
    });

    it('returns the resolved workflow editor URL without the executions tab', async () => {
      const { result } = renderHook(() => useWorkflowEditorLink({ workflowId, workflowRunId }));

      await waitFor(() => {
        expect(result.current.editorUrl).toBe('/app/workflows/workflow-abc');
      });
    });
  });
});

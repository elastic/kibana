/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { act, renderHook, waitFor } from '@testing-library/react';
import type { HttpSetup } from '@kbn/core/public';

import { useKibana } from '../../../../../../common/lib/kibana';
import { useGenerateWorkflow } from '.';
import { useInvalidateListWorkflows } from '../use_list_workflows';

vi.mock('../../../../../../common/lib/kibana');
vi.mock('../use_list_workflows', () => {
  const mocked = {
    useInvalidateListWorkflows: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/react-kibana-mount', () => {
  const mocked = {
    toMountPoint: vi.fn((node: unknown) => node),
  };
  return { ...mocked, default: mocked };
});

const mockUseKibana = useKibana as MockedFunction<typeof useKibana>;
const mockUseInvalidateListWorkflows = useInvalidateListWorkflows as MockedFunction<
  typeof useInvalidateListWorkflows
>;

const mockAddSuccess = vi.fn();
const mockAddError = vi.fn();
const mockAddInfo = vi.fn();

vi.mock('../../../../../../common/hooks/use_app_toasts', () => {
  const mocked = {
    useAppToasts: () => ({
      addError: mockAddError,
      addInfo: mockAddInfo,
      addSuccess: mockAddSuccess,
    }),
  };
  return { ...mocked, default: mocked };
});

const GENERATE_WORKFLOW_URL = '/internal/attack_discovery/_generate_workflow';

describe('useGenerateWorkflow', () => {
  const mockInvalidateListWorkflows = vi.fn();
  const mockHttpPost = vi.fn();
  const mockGetUrlForApp = vi.fn(
    (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path ?? ''}`
  );

  const mockHttp = {
    post: mockHttpPost,
  } as unknown as HttpSetup;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        application: { getUrlForApp: mockGetUrlForApp },
        http: mockHttp,
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockUseInvalidateListWorkflows.mockReturnValue(mockInvalidateListWorkflows);
  });

  it('returns isGenerating as false initially', () => {
    const { result } = renderHook(() => useGenerateWorkflow());

    expect(result.current.isGenerating).toBe(false);
  });

  it('returns generatedWorkflow as null initially', () => {
    const { result } = renderHook(() => useGenerateWorkflow());

    expect(result.current.generatedWorkflow).toBeNull();
  });

  describe('startGeneration', () => {
    it('sets isGenerating to true when called', () => {
      mockHttpPost.mockReturnValue(new Promise(() => {})); // never resolves

      const { result } = renderHook(() => useGenerateWorkflow());

      act(() => {
        result.current.startGeneration('test description', 'connector-1');
      });

      expect(result.current.isGenerating).toBe(true);
    });

    it('calls POST with the correct URL', async () => {
      mockHttpPost.mockResolvedValue({
        workflow_id: 'wf-1',
        workflow_name: 'Generated Workflow',
      });

      const { result } = renderHook(() => useGenerateWorkflow());

      act(() => {
        result.current.startGeneration('test description', 'connector-1');
      });

      await waitFor(() => {
        expect(mockHttpPost).toHaveBeenCalledWith(GENERATE_WORKFLOW_URL, expect.any(Object));
      });
    });

    it('sends connector_id and description in snake_case body', async () => {
      mockHttpPost.mockResolvedValue({
        workflow_id: 'wf-1',
        workflow_name: 'Generated Workflow',
      });

      const { result } = renderHook(() => useGenerateWorkflow());

      act(() => {
        result.current.startGeneration('test description', 'connector-1');
      });

      await waitFor(() => {
        expect(mockHttpPost).toHaveBeenCalledWith(
          GENERATE_WORKFLOW_URL,
          expect.objectContaining({
            body: JSON.stringify({
              connector_id: 'connector-1',
              description: 'test description',
            }),
          })
        );
      });
    });

    it('passes an AbortSignal to the HTTP call', async () => {
      mockHttpPost.mockResolvedValue({
        workflow_id: 'wf-1',
        workflow_name: 'Generated Workflow',
      });

      const { result } = renderHook(() => useGenerateWorkflow());

      act(() => {
        result.current.startGeneration('test description', 'connector-1');
      });

      await waitFor(() => {
        expect(mockHttpPost).toHaveBeenCalledWith(
          GENERATE_WORKFLOW_URL,
          expect.objectContaining({
            signal: expect.any(AbortSignal),
          })
        );
      });
    });
  });

  describe('on success', () => {
    const successResponse = {
      workflow_id: 'wf-1',
      workflow_name: 'Generated Workflow',
    };

    it('sets generatedWorkflow to the response', async () => {
      mockHttpPost.mockResolvedValue(successResponse);

      const { result } = renderHook(() => useGenerateWorkflow());

      act(() => {
        result.current.startGeneration('test description', 'connector-1');
      });

      await waitFor(() => {
        expect(result.current.generatedWorkflow).toEqual(successResponse);
      });
    });

    it('sets isGenerating to false', async () => {
      mockHttpPost.mockResolvedValue(successResponse);

      const { result } = renderHook(() => useGenerateWorkflow());

      act(() => {
        result.current.startGeneration('test description', 'connector-1');
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });

    it('shows a success toast with a title and text', async () => {
      mockHttpPost.mockResolvedValue(successResponse);

      const { result } = renderHook(() => useGenerateWorkflow());

      act(() => {
        result.current.startGeneration('test description', 'connector-1');
      });

      await waitFor(() => {
        expect(mockAddSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.any(String),
            text: expect.anything(),
          })
        );
      });
    });

    it('builds the workflow editor URL using the workflow id', async () => {
      mockHttpPost.mockResolvedValue(successResponse);

      const { result } = renderHook(() => useGenerateWorkflow());

      act(() => {
        result.current.startGeneration('test description', 'connector-1');
      });

      await waitFor(() => {
        expect(mockGetUrlForApp).toHaveBeenCalledWith('workflows', {
          path: `/${encodeURIComponent(successResponse.workflow_id)}`,
        });
      });
    });

    it('invalidates the list workflows query cache', async () => {
      mockHttpPost.mockResolvedValue(successResponse);

      const { result } = renderHook(() => useGenerateWorkflow());

      act(() => {
        result.current.startGeneration('test description', 'connector-1');
      });

      await waitFor(() => {
        expect(mockInvalidateListWorkflows).toHaveBeenCalled();
      });
    });
  });

  describe('on error', () => {
    const error = new Error('Generation failed');

    it('sets isGenerating to false', async () => {
      mockHttpPost.mockRejectedValue(error);

      const { result } = renderHook(() => useGenerateWorkflow());

      act(() => {
        result.current.startGeneration('test description', 'connector-1');
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });

    it('sets generatedWorkflow to null', async () => {
      mockHttpPost.mockRejectedValue(error);

      const { result } = renderHook(() => useGenerateWorkflow());

      act(() => {
        result.current.startGeneration('test description', 'connector-1');
      });

      await waitFor(() => {
        expect(result.current.generatedWorkflow).toBeNull();
      });
    });

    it('shows an error toast with the translated title', async () => {
      mockHttpPost.mockRejectedValue(error);

      const { result } = renderHook(() => useGenerateWorkflow());

      act(() => {
        result.current.startGeneration('test description', 'connector-1');
      });

      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledWith(error, {
          title: 'Failed to generate workflow',
        });
      });
    });

    it('does not invalidate the list workflows query cache', async () => {
      mockHttpPost.mockRejectedValue(error);

      const { result } = renderHook(() => useGenerateWorkflow());

      act(() => {
        result.current.startGeneration('test description', 'connector-1');
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(mockInvalidateListWorkflows).not.toHaveBeenCalled();
    });
  });

  describe('cancelGeneration', () => {
    it('resets isGenerating to false', async () => {
      mockHttpPost.mockReturnValue(new Promise(() => {})); // never resolves

      const { result } = renderHook(() => useGenerateWorkflow());

      act(() => {
        result.current.startGeneration('test description', 'connector-1');
      });

      expect(result.current.isGenerating).toBe(true);

      act(() => {
        result.current.cancelGeneration();
      });

      expect(result.current.isGenerating).toBe(false);
    });

    it('does not show a success toast when cancelled', async () => {
      mockHttpPost.mockImplementation(
        (_url: string, options: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          })
      );

      const { result } = renderHook(() => useGenerateWorkflow());

      act(() => {
        result.current.startGeneration('test description', 'connector-1');
      });

      act(() => {
        result.current.cancelGeneration();
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(mockAddSuccess).not.toHaveBeenCalled();
    });

    it('does not show an error toast when cancelled', async () => {
      mockHttpPost.mockImplementation(
        (_url: string, options: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          })
      );

      const { result } = renderHook(() => useGenerateWorkflow());

      act(() => {
        result.current.startGeneration('test description', 'connector-1');
      });

      act(() => {
        result.current.cancelGeneration();
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(mockAddError).not.toHaveBeenCalled();
    });
  });
});

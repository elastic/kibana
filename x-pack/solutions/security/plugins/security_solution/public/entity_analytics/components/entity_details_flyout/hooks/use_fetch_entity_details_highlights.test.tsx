/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import type { AnonymizationFieldResponse, Replacements } from '@kbn/elastic-assistant-common';
import type {
  PersistedEntityAiSummary,
  EntitySummaryStalenessEntitySnapshot,
} from '@kbn/entity-store/common';
import { useFetchEntityDetailsHighlights } from './use_fetch_entity_details_highlights';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import type { EntityHighlightsResponse } from '../types';

const mockFetchEntityDetailsHighlights = jest.fn();
const mockSaveEntityAiSummary = jest.fn();
const mockAddError = jest.fn();
const mockInferenceOutput = jest.fn();

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

jest.mock('../../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    fetchEntityDetailsHighlights: mockFetchEntityDetailsHighlights,
    saveEntityAiSummary: mockSaveEntityAiSummary,
  }),
}));

jest.mock('../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addError: mockAddError,
  }),
}));

jest.mock('../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(),
}));

const mockProps = {
  connectorId: 'test-connector-id',
  anonymizationFields: [
    {
      id: 'field1',
      field: 'test.field',
      allowed: true,
      anonymized: false,
    },
  ] as AnonymizationFieldResponse[],
  entityType: 'user',
  entityIdentifier: 'test-user',
  persistSummary: true,
};

const mockEntityDetailsResponse = {
  summary: { entitySummary: 'Test summary data' },
  replacements: { 'anonymized-user': 'test-user' } as Replacements,
  prompt: 'Test prompt for AI',
};

const mockSuccessfulInferenceOutput: {
  output: EntityHighlightsResponse;
  content: string;
} = {
  output: {
    highlights: [{ title: 'Test Highlight', text: 'Test highlight text' }],
    recommended_actions: ['Action 1', 'Action 2'],
  },
  content: 'AI generated analysis of the entity',
};

const mockEntitySnapshot: EntitySummaryStalenessEntitySnapshot = { riskScoreNorm: 55 };

const mockStoredSummary: PersistedEntityAiSummary = {
  highlights: [{ title: 'Stored Highlight', text: 'Stored highlight text' }],
  recommended_actions: ['Stored action'],
  generated_at: 1_700_000_000_000,
  generated_by: 'stored-user',
  author_profile_uid: 'u_stored_user',
  staleness: {
    enabled_signals: ['risk_score'],
    snapshot: { risk_score: 42 },
  },
};

describe('useFetchEntityDetailsHighlights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveEntityAiSummary.mockResolvedValue({ created: true });

    mockUseKibana.mockReturnValue({
      services: {
        inference: {
          output: mockInferenceOutput,
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it('returns the expected initial state and functions', () => {
    const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

    expect(result.current).toEqual({
      fetchEntityHighlights: expect.any(Function),
      isGeneratingSummary: false,
      abortStream: expect.any(Function),
      result: null,
      error: null,
      generationBaseline: null,
    });
  });

  it('successfully fetches entity highlights and sends message to AI', async () => {
    mockFetchEntityDetailsHighlights.mockResolvedValueOnce(mockEntityDetailsResponse);
    mockInferenceOutput.mockResolvedValueOnce(mockSuccessfulInferenceOutput);

    const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

    await act(async () => {
      await result.current.fetchEntityHighlights();
    });

    expect(mockFetchEntityDetailsHighlights).toHaveBeenCalledWith({
      entityType: 'user',
      entityIdentifier: 'test-user',
      anonymizationFields: mockProps.anonymizationFields,
      from: expect.any(Number),
      to: expect.any(Number),
      connectorId: 'test-connector-id',
    });

    expect(mockInferenceOutput).toHaveBeenCalledWith({
      id: 'entity-highlights',
      connectorId: 'test-connector-id',
      schema: expect.any(Object),
      system: 'Test prompt for AI',
      input: expect.stringContaining('Context:'),
      abortSignal: expect.any(AbortSignal),
    });

    // Verify the result state is updated
    expect(result.current.result).toEqual({
      summaryAsText: JSON.stringify(mockEntityDetailsResponse.summary),
      response: mockSuccessfulInferenceOutput.output,
      replacements: mockEntityDetailsResponse.replacements,
      generatedAt: expect.any(Number),
      generatedBy: expect.any(String),
    });

    // Verify no errors were added
    expect(mockAddError).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('handles error from fetchEntityDetailsHighlights API', async () => {
    const apiError = new Error('API Error');
    mockFetchEntityDetailsHighlights.mockRejectedValueOnce(apiError);

    const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

    await act(async () => {
      await result.current.fetchEntityHighlights();
    });

    expect(mockAddError).toHaveBeenCalledWith(apiError, {
      title: 'Failed to run LLM',
    });

    // Verify inference.output was not called due to early return
    expect(mockInferenceOutput).not.toHaveBeenCalled();

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('handles error from inference.output', async () => {
    const inferenceError = new Error('Error processing request');
    mockFetchEntityDetailsHighlights.mockResolvedValueOnce(mockEntityDetailsResponse);
    mockInferenceOutput.mockRejectedValueOnce(inferenceError);

    const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

    await act(async () => {
      await result.current.fetchEntityHighlights();
    });

    expect(mockFetchEntityDetailsHighlights).toHaveBeenCalled();

    expect(mockInferenceOutput).toHaveBeenCalled();

    expect(mockAddError).toHaveBeenCalledWith(inferenceError, {
      title: 'Failed to run LLM',
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('returns early when fetchEntityDetailsHighlights returns null summary', async () => {
    mockFetchEntityDetailsHighlights.mockResolvedValueOnce({
      summary: null,
      replacements: mockEntityDetailsResponse.replacements,
      prompt: mockEntityDetailsResponse.prompt,
    });

    const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

    await act(async () => {
      await result.current.fetchEntityHighlights();
    });

    expect(mockInferenceOutput).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
  });

  it('returns early when fetchEntityDetailsHighlights returns null replacements', async () => {
    mockFetchEntityDetailsHighlights.mockResolvedValueOnce({
      summary: mockEntityDetailsResponse.summary,
      replacements: null,
      prompt: mockEntityDetailsResponse.prompt,
    });

    const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

    await act(async () => {
      await result.current.fetchEntityHighlights();
    });

    expect(mockInferenceOutput).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
  });

  it('returns early when fetchEntityDetailsHighlights returns null prompt', async () => {
    mockFetchEntityDetailsHighlights.mockResolvedValueOnce({
      summary: mockEntityDetailsResponse.summary,
      replacements: mockEntityDetailsResponse.replacements,
      prompt: null,
    });

    const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

    await act(async () => {
      await result.current.fetchEntityHighlights();
    });

    expect(mockInferenceOutput).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
  });

  it('formats the input correctly with entity context', async () => {
    mockFetchEntityDetailsHighlights.mockResolvedValueOnce(mockEntityDetailsResponse);
    mockInferenceOutput.mockResolvedValueOnce(mockSuccessfulInferenceOutput);

    const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

    await act(async () => {
      await result.current.fetchEntityHighlights();
    });

    const expectedInput = `Context:
            EntityType: user,
            EntityIdentifier: anonymized-user,
          ${JSON.stringify(mockEntityDetailsResponse.summary)}`;

    expect(mockInferenceOutput).toHaveBeenCalledWith({
      id: 'entity-highlights',
      connectorId: 'test-connector-id',
      schema: expect.any(Object),
      system: 'Test prompt for AI',
      input: expectedInput,
      abortSignal: expect.any(AbortSignal),
    });
  });

  describe('persistence', () => {
    it('persists the generated summary with the entity-snapshot staleness and model counts', async () => {
      mockFetchEntityDetailsHighlights.mockResolvedValueOnce(mockEntityDetailsResponse);
      mockInferenceOutput.mockResolvedValueOnce(mockSuccessfulInferenceOutput);

      const { result } = renderHook(() =>
        useFetchEntityDetailsHighlights({ ...mockProps, entitySnapshot: mockEntitySnapshot })
      );

      await act(async () => {
        await result.current.fetchEntityHighlights();
      });

      expect(mockSaveEntityAiSummary).toHaveBeenCalledWith({
        entityId: 'test-user',
        entityType: 'user',
        summary: {
          highlights: mockSuccessfulInferenceOutput.output.highlights,
          recommended_actions: mockSuccessfulInferenceOutput.output.recommended_actions,
          generated_at: expect.any(Number),
          staleness: {
            enabled_signals: ['risk_score'],
            snapshot: { risk_score: 55 },
          },
        },
        modelOutputCounts: {
          highlights: 1,
          recommendedActions: 2,
        },
      });
    });

    it('skips persistence when the user lacks metadata read access (canRead: false)', async () => {
      mockFetchEntityDetailsHighlights.mockResolvedValueOnce(mockEntityDetailsResponse);
      mockInferenceOutput.mockResolvedValueOnce(mockSuccessfulInferenceOutput);
      const refetchEntityRecord = jest.fn();
      const refetchPersistedSummary = jest.fn();

      const { result } = renderHook(() =>
        useFetchEntityDetailsHighlights({
          ...mockProps,
          entitySnapshot: mockEntitySnapshot,
          persistSummary: false,
          refetchEntityRecord,
          refetchPersistedSummary,
        })
      );

      await act(async () => {
        await result.current.fetchEntityHighlights();
      });

      // In-session result is still set — generation is on-demand only.
      expect(result.current.result?.response).toEqual(mockSuccessfulInferenceOutput.output);
      expect(mockSaveEntityAiSummary).not.toHaveBeenCalled();
      expect(refetchEntityRecord).not.toHaveBeenCalled();
      expect(refetchPersistedSummary).not.toHaveBeenCalled();
      expect(mockAddError).not.toHaveBeenCalled();
    });

    it('refreshes the entity record and persisted summary after a successful save', async () => {
      mockFetchEntityDetailsHighlights.mockResolvedValueOnce(mockEntityDetailsResponse);
      mockInferenceOutput.mockResolvedValueOnce(mockSuccessfulInferenceOutput);
      const refetchEntityRecord = jest.fn();
      const refetchPersistedSummary = jest.fn();

      const { result } = renderHook(() =>
        useFetchEntityDetailsHighlights({
          ...mockProps,
          entitySnapshot: mockEntitySnapshot,
          refetchEntityRecord,
          refetchPersistedSummary,
        })
      );

      await act(async () => {
        await result.current.fetchEntityHighlights();
      });

      await waitFor(() => expect(refetchEntityRecord).toHaveBeenCalled());
      expect(refetchPersistedSummary).toHaveBeenCalled();
    });

    it('shows a non-blocking error toast when persisting the summary fails', async () => {
      mockFetchEntityDetailsHighlights.mockResolvedValueOnce(mockEntityDetailsResponse);
      mockInferenceOutput.mockResolvedValueOnce(mockSuccessfulInferenceOutput);
      const persistError = new Error('persist failed');
      mockSaveEntityAiSummary.mockRejectedValueOnce(persistError);

      const { result } = renderHook(() => useFetchEntityDetailsHighlights(mockProps));

      await act(async () => {
        await result.current.fetchEntityHighlights();
      });

      await waitFor(() =>
        expect(mockAddError).toHaveBeenCalledWith(persistError, {
          title: 'Could not save AI summary — it will not persist after refresh.',
        })
      );

      // The in-session result stays usable even though the persist failed.
      expect(result.current.result?.response).toEqual(mockSuccessfulInferenceOutput.output);
      expect(result.current.error).toBeNull();
    });
  });

  describe('generation baseline', () => {
    it('captures the entity snapshot as the generation baseline on generation', async () => {
      mockFetchEntityDetailsHighlights.mockResolvedValueOnce(mockEntityDetailsResponse);
      mockInferenceOutput.mockResolvedValueOnce(mockSuccessfulInferenceOutput);

      const { result } = renderHook(() =>
        useFetchEntityDetailsHighlights({ ...mockProps, entitySnapshot: mockEntitySnapshot })
      );

      expect(result.current.generationBaseline).toBeNull();

      await act(async () => {
        await result.current.fetchEntityHighlights();
      });

      expect(result.current.generationBaseline).toEqual(mockEntitySnapshot);
    });

    it('resets the generation baseline when the entity changes', async () => {
      mockFetchEntityDetailsHighlights.mockResolvedValueOnce(mockEntityDetailsResponse);
      mockInferenceOutput.mockResolvedValueOnce(mockSuccessfulInferenceOutput);

      const { result, rerender } = renderHook(
        (props: Parameters<typeof useFetchEntityDetailsHighlights>[0]) =>
          useFetchEntityDetailsHighlights(props),
        { initialProps: { ...mockProps, entitySnapshot: mockEntitySnapshot } }
      );

      await act(async () => {
        await result.current.fetchEntityHighlights();
      });

      expect(result.current.generationBaseline).toEqual(mockEntitySnapshot);

      rerender({
        ...mockProps,
        entityIdentifier: 'other-user',
        entitySnapshot: mockEntitySnapshot,
      });

      expect(result.current.generationBaseline).toBeNull();
    });
  });

  describe('stored summary hydration', () => {
    it('hydrates the result from a stored summary that arrives after mount', () => {
      const { result, rerender } = renderHook(
        (props: Parameters<typeof useFetchEntityDetailsHighlights>[0]) =>
          useFetchEntityDetailsHighlights(props),
        {
          initialProps: {
            ...mockProps,
            storedSummary: null as PersistedEntityAiSummary | null,
          },
        }
      );

      expect(result.current.result).toBeNull();

      rerender({ ...mockProps, storedSummary: mockStoredSummary });

      expect(result.current.result).toEqual({
        response: {
          highlights: mockStoredSummary.highlights,
          recommended_actions: mockStoredSummary.recommended_actions,
        },
        replacements: {},
        summaryAsText: '',
        generatedAt: mockStoredSummary.generated_at,
        generatedBy: mockStoredSummary.generated_by,
        authorProfileUid: mockStoredSummary.author_profile_uid,
      });
    });

    it('does not overwrite a freshly generated result when a stored summary arrives later', async () => {
      mockFetchEntityDetailsHighlights.mockResolvedValueOnce(mockEntityDetailsResponse);
      mockInferenceOutput.mockResolvedValueOnce(mockSuccessfulInferenceOutput);

      const { result, rerender } = renderHook(
        (props: Parameters<typeof useFetchEntityDetailsHighlights>[0]) =>
          useFetchEntityDetailsHighlights(props),
        {
          initialProps: {
            ...mockProps,
            storedSummary: null as PersistedEntityAiSummary | null,
          },
        }
      );

      await act(async () => {
        await result.current.fetchEntityHighlights();
      });

      expect(result.current.result?.response).toEqual(mockSuccessfulInferenceOutput.output);

      // A late read-back of a (now superseded) stored summary must not clobber the
      // just-generated in-session result.
      rerender({ ...mockProps, storedSummary: mockStoredSummary });

      expect(result.current.result?.response).toEqual(mockSuccessfulInferenceOutput.output);
      expect(result.current.result?.generatedBy).not.toBe(mockStoredSummary.generated_by);
    });
  });
});

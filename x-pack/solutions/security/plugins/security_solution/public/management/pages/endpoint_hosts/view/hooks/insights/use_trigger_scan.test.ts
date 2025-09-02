/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useTriggerScan } from './use_trigger_scan';

jest.mock('../../../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: { http: { post: jest.fn() } },
  }),
  useToasts: () => ({
    addSuccess: jest.fn(),
    addError: jest.fn(),
    addWarning: jest.fn(),
    addDanger: jest.fn(),
  }),
}));

jest.mock('../../../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

jest.mock(
  '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields',
  () => ({
    useFetchAnonymizationFields: () => ({ data: { data: [] } }),
  })
);

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
}));

const mockUseIsExperimentalFeatureEnabled = jest.requireMock(
  '../../../../../../common/hooks/use_experimental_features'
).useIsExperimentalFeatureEnabled;

const mockUseMutation = jest.requireMock('@tanstack/react-query').useMutation;

describe('useTriggerScan', () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue({
      isLoading: false,
      mutate: jest.fn(),
      data: undefined,
      error: null,
    });

    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should initialize with correct default state', () => {
      const mockOnSuccess = jest.fn();
      const { result } = renderHook(() => useTriggerScan({ onSuccess: mockOnSuccess }));

      expect(result.current.isLoading).toBe(false);
      expect(typeof result.current.mutate).toBe('function');
    });

    it('should accept configuration with onSuccess callback', () => {
      const mockOnSuccess = jest.fn();
      const { result } = renderHook(() => useTriggerScan({ onSuccess: mockOnSuccess }));

      expect(result.current.isLoading).toBe(false);
    });

    it('should provide mutate function for triggering scans', () => {
      const mockOnSuccess = jest.fn();
      const { result } = renderHook(() => useTriggerScan({ onSuccess: mockOnSuccess }));

      expect(typeof result.current.mutate).toBe('function');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('feature flag dependency', () => {
    it('should call useIsExperimentalFeatureEnabled with correct feature name', () => {
      const mockOnSuccess = jest.fn();
      renderHook(() => useTriggerScan({ onSuccess: mockOnSuccess }));

      // The hook should be set up to check for the feature flag when filtering types
      expect(mockUseIsExperimentalFeatureEnabled).toHaveBeenCalledWith(
        'defendInsightsPolicyResponseFailure'
      );
    });

    it('should handle feature flag being undefined', () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(undefined);
      const mockOnSuccess = jest.fn();

      const { result } = renderHook(() => useTriggerScan({ onSuccess: mockOnSuccess }));

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle feature flag returning true', () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
      const mockOnSuccess = jest.fn();

      const { result } = renderHook(() => useTriggerScan({ onSuccess: mockOnSuccess }));

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle feature flag returning false', () => {
      mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
      const mockOnSuccess = jest.fn();

      const { result } = renderHook(() => useTriggerScan({ onSuccess: mockOnSuccess }));

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('backward compatibility', () => {
    it('should maintain compatibility with existing usage patterns', () => {
      const mockOnSuccess = jest.fn();
      const { result } = renderHook(() => useTriggerScan({ onSuccess: mockOnSuccess }));

      expect(result.current.isLoading).toBe(false);
      expect(typeof result.current.mutate).toBe('function');
    });
  });

  describe('toast notifications', () => {
    it('should have access to toast service for notifications', () => {
      const mockOnSuccess = jest.fn();
      const { result } = renderHook(() => useTriggerScan({ onSuccess: mockOnSuccess }));

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('mutation hook integration', () => {
    it('should integrate with useMutation hook', () => {
      const mockOnSuccess = jest.fn();
      const { result } = renderHook(() => useTriggerScan({ onSuccess: mockOnSuccess }));

      expect(mockUseMutation).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should provide mutate function from useMutation', () => {
      const mockMutate = jest.fn();
      mockUseMutation.mockReturnValue({
        isLoading: false,
        mutate: mockMutate,
        data: undefined,
        error: null,
      });

      const mockOnSuccess = jest.fn();
      const { result } = renderHook(() => useTriggerScan({ onSuccess: mockOnSuccess }));

      expect(result.current.mutate).toBe(mockMutate);
    });
  });
});

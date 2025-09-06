/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useFindPrompts } from '@kbn/elastic-assistant';
import type { UseFindPromptContextsParams } from './use_find_cost_savings_prompts';
import { useFindCostSavingsPrompts } from './use_find_cost_savings_prompts';

jest.mock('@kbn/elastic-assistant');

describe('useFindCostSavingsPrompts', () => {
  const mockUseFindPrompts = useFindPrompts as jest.MockedFunction<typeof useFindPrompts>;

  const defaultParams: UseFindPromptContextsParams = {
    context: {
      isAssistantEnabled: true,
      httpFetch: jest.fn(),
      toasts: {
        addError: jest.fn(),
        addSuccess: jest.fn(),
        addWarning: jest.fn(),
        remove: jest.fn(),
      },
    },
    params: {
      prompt_ids: ['costSavingsInsightPart1', 'costSavingsInsightPart2'],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns both prompts when they are found', () => {
    const mockPrompts = [
      {
        promptId: 'costSavingsInsightPart1',
        prompt: 'This is the first part of the cost savings insight',
      },
      {
        promptId: 'costSavingsInsightPart2',
        prompt: 'This is the second part of the cost savings insight',
      },
    ];

    mockUseFindPrompts.mockReturnValue({
      data: { prompts: mockPrompts },
    } as ReturnType<typeof useFindPrompts>);

    const { result } = renderHook(() => useFindCostSavingsPrompts(defaultParams));

    expect(result.current).toEqual({
      part1: 'This is the first part of the cost savings insight',
      part2: 'This is the second part of the cost savings insight',
    });
  });

  it('returns null when part1 prompt is missing', () => {
    const mockPrompts = [
      {
        promptId: 'costSavingsInsightPart2',
        prompt: 'This is the second part of the cost savings insight',
      },
    ];

    mockUseFindPrompts.mockReturnValue({
      data: { prompts: mockPrompts },
    } as ReturnType<typeof useFindPrompts>);

    const { result } = renderHook(() => useFindCostSavingsPrompts(defaultParams));

    expect(result.current).toBeNull();
  });

  it('returns null when part2 prompt is missing', () => {
    const mockPrompts = [
      {
        promptId: 'costSavingsInsightPart1',
        prompt: 'This is the first part of the cost savings insight',
      },
    ];

    mockUseFindPrompts.mockReturnValue({
      data: { prompts: mockPrompts },
    } as ReturnType<typeof useFindPrompts>);

    const { result } = renderHook(() => useFindCostSavingsPrompts(defaultParams));

    expect(result.current).toBeNull();
  });

  it('returns null when both prompts are missing', () => {
    const mockPrompts = [
      {
        promptId: 'someOtherPrompt',
        prompt: 'This is some other prompt',
      },
    ];

    mockUseFindPrompts.mockReturnValue({
      data: { prompts: mockPrompts },
    } as ReturnType<typeof useFindPrompts>);

    const { result } = renderHook(() => useFindCostSavingsPrompts(defaultParams));

    expect(result.current).toBeNull();
  });

  it('returns null when prompts array is empty', () => {
    mockUseFindPrompts.mockReturnValue({
      data: { prompts: [] },
    } as ReturnType<typeof useFindPrompts>);

    const { result } = renderHook(() => useFindCostSavingsPrompts(defaultParams));

    expect(result.current).toBeNull();
  });

  it('returns null when prompts array is undefined', () => {
    mockUseFindPrompts.mockReturnValue({
      data: { prompts: undefined },
    } as ReturnType<typeof useFindPrompts>);

    const { result } = renderHook(() => useFindCostSavingsPrompts(defaultParams));

    expect(result.current).toBeNull();
  });

  it('calls useFindPrompts with the correct parameters', () => {
    const mockPrompts = [
      {
        promptId: 'costSavingsInsightPart1',
        prompt: 'Part 1',
      },
      {
        promptId: 'costSavingsInsightPart2',
        prompt: 'Part 2',
      },
    ];

    mockUseFindPrompts.mockReturnValue({
      data: { prompts: mockPrompts },
    } as ReturnType<typeof useFindPrompts>);

    renderHook(() => useFindCostSavingsPrompts(defaultParams));

    expect(mockUseFindPrompts).toHaveBeenCalledWith(defaultParams);
  });

  it('handles prompts with empty string values', () => {
    const mockPrompts = [
      {
        promptId: 'costSavingsInsightPart1',
        prompt: '',
      },
      {
        promptId: 'costSavingsInsightPart2',
        prompt: '',
      },
    ];

    mockUseFindPrompts.mockReturnValue({
      data: { prompts: mockPrompts },
    } as ReturnType<typeof useFindPrompts>);

    const { result } = renderHook(() => useFindCostSavingsPrompts(defaultParams));

    expect(result.current).toEqual({
      part1: '',
      part2: '',
    });
  });

  it('handles prompts with null values', () => {
    const mockPrompts = [
      {
        promptId: 'costSavingsInsightPart1',
        prompt: null,
      },
      {
        promptId: 'costSavingsInsightPart2',
        prompt: null,
      },
    ];

    mockUseFindPrompts.mockReturnValue({
      data: { prompts: mockPrompts },
    } as ReturnType<typeof useFindPrompts>);

    const { result } = renderHook(() => useFindCostSavingsPrompts(defaultParams));

    expect(result.current).toBeNull();
  });
});

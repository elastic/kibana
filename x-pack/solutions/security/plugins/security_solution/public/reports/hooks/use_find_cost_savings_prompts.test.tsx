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
      // @ts-ignore
      toasts: {
        addError: jest.fn(),
        addSuccess: jest.fn(),
        addWarning: jest.fn(),
        remove: jest.fn(),
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles various prompt scenarios correctly', () => {
    const bothPrompts = [
      { promptId: 'costSavingsInsightPart1', prompt: 'First part' },
      { promptId: 'costSavingsInsightPart2', prompt: 'Second part' },
    ];
    mockUseFindPrompts.mockReturnValue({
      data: { prompts: bothPrompts },
    } as ReturnType<typeof useFindPrompts>);
    const { result: result1 } = renderHook(() => useFindCostSavingsPrompts(defaultParams));
    expect(result1.current).toEqual({ part1: 'First part', part2: 'Second part' });
    const part1Missing = [{ promptId: 'costSavingsInsightPart2', prompt: 'Second part' }];
    mockUseFindPrompts.mockReturnValue({
      data: { prompts: part1Missing },
    } as ReturnType<typeof useFindPrompts>);
    const { result: result2 } = renderHook(() => useFindCostSavingsPrompts(defaultParams));
    expect(result2.current).toBeNull();
    const part2Missing = [{ promptId: 'costSavingsInsightPart1', prompt: 'First part' }];
    mockUseFindPrompts.mockReturnValue({
      data: { prompts: part2Missing },
    } as ReturnType<typeof useFindPrompts>);
    const { result: result3 } = renderHook(() => useFindCostSavingsPrompts(defaultParams));
    expect(result3.current).toBeNull();
    const bothMissing = [{ promptId: 'someOtherPrompt', prompt: 'Other prompt' }];
    mockUseFindPrompts.mockReturnValue({
      data: { prompts: bothMissing },
    } as ReturnType<typeof useFindPrompts>);
    const { result: result4 } = renderHook(() => useFindCostSavingsPrompts(defaultParams));
    expect(result4.current).toBeNull();
    mockUseFindPrompts.mockReturnValue({
      data: { prompts: [] },
    } as unknown as ReturnType<typeof useFindPrompts>);
    const { result: result5 } = renderHook(() => useFindCostSavingsPrompts(defaultParams));
    expect(result5.current).toBeNull();
    mockUseFindPrompts.mockReturnValue({
      data: { prompts: undefined },
    } as unknown as ReturnType<typeof useFindPrompts>);
    const { result: result6 } = renderHook(() => useFindCostSavingsPrompts(defaultParams));
    expect(result6.current).toBeNull();
  });

  it('handles prompts with empty and null values correctly', () => {
    const emptyPrompts = [
      { promptId: 'costSavingsInsightPart1', prompt: '' },
      { promptId: 'costSavingsInsightPart2', prompt: '' },
    ];
    mockUseFindPrompts.mockReturnValue({
      data: { prompts: emptyPrompts },
    } as ReturnType<typeof useFindPrompts>);
    const { result: result1 } = renderHook(() => useFindCostSavingsPrompts(defaultParams));
    expect(result1.current).toEqual({ part1: '', part2: '' });
    const nullPrompts = [
      { promptId: 'costSavingsInsightPart1', prompt: null },
      { promptId: 'costSavingsInsightPart2', prompt: null },
    ];
    mockUseFindPrompts.mockReturnValue({
      data: { prompts: nullPrompts },
    } as unknown as ReturnType<typeof useFindPrompts>);
    const { result: result2 } = renderHook(() => useFindCostSavingsPrompts(defaultParams));
    expect(result2.current).toBeNull();
  });
});

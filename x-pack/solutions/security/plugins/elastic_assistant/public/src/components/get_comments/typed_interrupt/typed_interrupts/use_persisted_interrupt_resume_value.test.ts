/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useInterruptResumeValue } from './use_persisted_interrupt_resume_value';
import type { InterruptValue, InterruptResumeValue } from '@kbn/elastic-assistant-common';

// Mock data for testing
const mockSelectOptionInterrupt: Extract<InterruptValue, { type: 'SELECT_OPTION' }> = {
  id: 'test-interrupt-1',
  type: 'SELECT_OPTION',
  threadId: 'thread-1',
  description: 'Choose an option',
  options: [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
  ],
};

const mockInputTextInterrupt: Extract<InterruptValue, { type: 'INPUT_TEXT' }> = {
  id: 'test-interrupt-2',
  type: 'INPUT_TEXT',
  threadId: 'thread-2',
  description: 'Enter text',
  placeholder: 'Type here...',
};

const mockSelectOptionResumeValue: Extract<InterruptResumeValue, { type: 'SELECT_OPTION' }> = {
  type: 'SELECT_OPTION',
  interruptId: 'test-interrupt-1',
  value: 'option1',
};

const mockInputTextResumeValue: Extract<InterruptResumeValue, { type: 'INPUT_TEXT' }> = {
  type: 'INPUT_TEXT',
  interruptId: 'test-interrupt-2',
  value: 'user input text',
};

// Test wrapper component
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  Wrapper.displayName = 'QueryClientTestWrapper';

  return Wrapper;
};

describe('useInterruptResumeValue', () => {
  it('should return live resume value when provided', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useInterruptResumeValue(mockSelectOptionInterrupt, mockSelectOptionResumeValue),
      { wrapper }
    );

    expect(result.current.resumeValue).toEqual(mockSelectOptionResumeValue);
  });

  it('should return undefined when no live or cached resume value exists', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useInterruptResumeValue(mockSelectOptionInterrupt, undefined),
      { wrapper }
    );

    expect(result.current.resumeValue).toBeUndefined();
  });

  it('should return cached resume value when live value is undefined', () => {
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      () => useInterruptResumeValue(mockSelectOptionInterrupt, undefined),
      { wrapper }
    );

    act(() => {
      result.current.setCachedResumeValue(mockSelectOptionResumeValue);
    });

    rerender();

    expect(result.current.resumeValue).toEqual(mockSelectOptionResumeValue);
  });

  it('should prioritize live resume value over cached value', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useInterruptResumeValue(mockSelectOptionInterrupt, mockSelectOptionResumeValue),
      { wrapper }
    );

    act(() => {
      result.current.setCachedResumeValue({
        type: 'SELECT_OPTION',
        interruptId: 'test-interrupt-1',
        value: 'different-option',
      });
    });

    expect(result.current.resumeValue).toEqual(mockSelectOptionResumeValue);
  });

  it('should set cached resume value correctly', () => {
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      () => useInterruptResumeValue(mockSelectOptionInterrupt, undefined),
      { wrapper }
    );

    act(() => {
      result.current.setCachedResumeValue(mockSelectOptionResumeValue);
    });

    rerender();

    expect(result.current.resumeValue).toEqual(mockSelectOptionResumeValue);
  });

  it('should work with INPUT_TEXT interrupt type', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useInterruptResumeValue(mockInputTextInterrupt, mockInputTextResumeValue),
      { wrapper }
    );

    expect(result.current.resumeValue).toEqual(mockInputTextResumeValue);
  });

  it('should cache resume value for INPUT_TEXT interrupt type', () => {
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      () => useInterruptResumeValue(mockInputTextInterrupt, undefined),
      { wrapper }
    );

    act(() => {
      result.current.setCachedResumeValue(mockInputTextResumeValue);
    });

    rerender();

    expect(result.current.resumeValue).toEqual(mockInputTextResumeValue);
  });

  it('should generate correct cache key based on interrupt id', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useInterruptResumeValue(mockSelectOptionInterrupt, undefined),
      { wrapper }
    );

    act(() => {
      result.current.setCachedResumeValue(mockSelectOptionResumeValue);
    });

    // Verify the cached value is accessible with the same interrupt id
    const { result: result2 } = renderHook(
      () => useInterruptResumeValue(mockSelectOptionInterrupt, undefined),
      { wrapper }
    );

    expect(result2.current.resumeValue).toEqual(mockSelectOptionResumeValue);
  });

  it('should not share cache between different interrupt ids', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useInterruptResumeValue(mockSelectOptionInterrupt, undefined),
      { wrapper }
    );

    act(() => {
      result.current.setCachedResumeValue(mockSelectOptionResumeValue);
    });

    const differentInterrupt = { ...mockSelectOptionInterrupt, id: 'different-id' };
    const { result: result2 } = renderHook(
      () => useInterruptResumeValue(differentInterrupt, undefined),
      { wrapper }
    );

    expect(result2.current.resumeValue).toBeUndefined();
  });

  it('should update cached value when setCachedResumeValue is called multiple times', () => {
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      () => useInterruptResumeValue(mockSelectOptionInterrupt, undefined),
      { wrapper }
    );

    const firstValue = { ...mockSelectOptionResumeValue, value: 'first-option' };
    const secondValue = { ...mockSelectOptionResumeValue, value: 'second-option' };

    act(() => {
      result.current.setCachedResumeValue(firstValue);
    });

    rerender();
    expect(result.current.resumeValue).toEqual(firstValue);

    act(() => {
      result.current.setCachedResumeValue(secondValue);
    });

    rerender();
    expect(result.current.resumeValue).toEqual(secondValue);
  });

  it('should return setCachedResumeValue function', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useInterruptResumeValue(mockSelectOptionInterrupt, undefined),
      { wrapper }
    );

    expect(typeof result.current.setCachedResumeValue).toBe('function');
  });
});

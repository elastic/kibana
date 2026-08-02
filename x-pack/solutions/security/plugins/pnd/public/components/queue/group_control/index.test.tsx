/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

import { QUEUE_GROUP_MODE_STORAGE_KEY } from '../types';
import { renderWithPndProviders } from '../../test_utils/render_with_pnd_providers';
import { GroupControl, useQueueGroupMode } from '.';

describe('GroupControl', () => {
  const defaultProps = {
    onChange: jest.fn(),
    value: 'type' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('reads Group by: Type in the default mode', () => {
    renderWithPndProviders(<GroupControl {...defaultProps} />);

    expect(screen.getByTestId('pndQueueGroupControl')).toHaveTextContent('Group by:');
    expect(screen.getByTestId('pndQueueGroupControl')).toHaveTextContent('Type');
  });

  it('names the control for a screen reader', () => {
    renderWithPndProviders(<GroupControl {...defaultProps} />);

    expect(screen.getByTestId('pndQueueGroupControl')).toHaveAttribute(
      'aria-label',
      'Group the queue by Type'
    );
  });

  it('offers the three grouping modes', () => {
    renderWithPndProviders(<GroupControl {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndQueueGroupControl'));

    expect(screen.getByTestId('pndQueueGroupModeOption-type')).toHaveTextContent('Type');
    expect(screen.getByTestId('pndQueueGroupModeOption-type-thread')).toHaveTextContent(
      'Type + thread context'
    );
    expect(screen.getByTestId('pndQueueGroupModeOption-thread')).toHaveTextContent('Thread');
  });

  it('notifies when the analyst picks a mode', () => {
    renderWithPndProviders(<GroupControl {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndQueueGroupControl'));
    fireEvent.click(screen.getByTestId('pndQueueGroupModeOption-thread'));

    expect(defaultProps.onChange).toHaveBeenCalledWith('thread');
  });

  it('persists the selected mode in sessionStorage', () => {
    renderWithPndProviders(<GroupControl {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndQueueGroupControl'));
    fireEvent.click(screen.getByTestId('pndQueueGroupModeOption-thread'));

    expect(window.sessionStorage.getItem(QUEUE_GROUP_MODE_STORAGE_KEY)).toEqual('thread');
  });
});

describe('useQueueGroupMode', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('starts in type when nothing has been persisted', () => {
    const { result } = renderHook(() => useQueueGroupMode());

    expect(result.current.mode).toEqual('type');
  });

  it('rehydrates a persisted mode', () => {
    window.sessionStorage.setItem(QUEUE_GROUP_MODE_STORAGE_KEY, 'thread');

    const { result } = renderHook(() => useQueueGroupMode());

    expect(result.current.mode).toEqual('thread');
  });

  it('persists a change so navigating away and back keeps the mode', () => {
    const { result } = renderHook(() => useQueueGroupMode());

    act(() => {
      result.current.onChange('type-thread');
    });

    expect(window.sessionStorage.getItem(QUEUE_GROUP_MODE_STORAGE_KEY)).toEqual('type-thread');
    expect(result.current.mode).toEqual('type-thread');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { ListOnItemsRendered, ListOnItemsRenderedProps } from 'react-window';
import { useInfiniteLoader } from './use_infinite_loader';

const renderItems = (
  onItemsRendered: ListOnItemsRendered,
  visibleStartIndex: number,
  visibleStopIndex: number
) => {
  const props: ListOnItemsRenderedProps = {
    overscanStartIndex: visibleStartIndex,
    overscanStopIndex: visibleStopIndex,
    visibleStartIndex,
    visibleStopIndex,
  };
  act(() => onItemsRendered(props));
};

describe('useInfiniteLoader', () => {
  it('scans within the threshold and extends ranges to the minimum batch size', () => {
    const loadMoreItems = jest.fn();
    const { result } = renderHook(() =>
      useInfiniteLoader({
        isItemLoaded: () => false,
        itemCount: 20,
        loadMoreItems,
        minimumBatchSize: 5,
        threshold: 1,
      })
    );

    renderItems(result.current, 5, 5);

    expect(loadMoreItems).toHaveBeenCalledTimes(1);
    expect(loadMoreItems).toHaveBeenCalledWith(4, 8);
  });

  it('loads separate ranges and clamps batches to the item count', () => {
    const loadMoreItems = jest.fn();
    const { result } = renderHook(() =>
      useInfiniteLoader({
        isItemLoaded: (index) => index !== 1 && index !== 5,
        itemCount: 7,
        loadMoreItems,
        minimumBatchSize: 3,
        threshold: 0,
      })
    );

    renderItems(result.current, 0, 6);

    expect(loadMoreItems.mock.calls).toEqual([
      [1, 3],
      [5, 6],
    ]);
  });

  it('skips unchanged ranges and loads a new range after scrolling', () => {
    const loadMoreItems = jest.fn();
    const { result } = renderHook(() =>
      useInfiniteLoader({
        isItemLoaded: () => false,
        itemCount: 20,
        loadMoreItems,
        minimumBatchSize: 3,
        threshold: 0,
      })
    );

    renderItems(result.current, 2, 3);
    renderItems(result.current, 2, 3);
    renderItems(result.current, 7, 7);

    expect(loadMoreItems.mock.calls).toEqual([
      [2, 4],
      [7, 9],
    ]);
  });
});

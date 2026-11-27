/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';
import type { ListOnItemsRendered, ListOnItemsRenderedProps } from 'react-window';

interface UnloadedRange {
  startIndex: number;
  stopIndex: number;
}

interface UseInfiniteLoaderOptions {
  isItemLoaded: (index: number) => boolean;
  itemCount: number;
  loadMoreItems: (startIndex: number, stopIndex: number) => void;
  minimumBatchSize: number;
  threshold: number;
}

const scanForUnloadedRanges = ({
  isItemLoaded,
  itemCount,
  minimumBatchSize,
  startIndex,
  stopIndex,
}: {
  isItemLoaded: (index: number) => boolean;
  itemCount: number;
  minimumBatchSize: number;
  startIndex: number;
  stopIndex: number;
}): UnloadedRange[] => {
  const unloadedRanges: UnloadedRange[] = [];
  let rangeStartIndex: number | undefined;
  let rangeStopIndex: number | undefined;

  for (let index = startIndex; index <= stopIndex; index++) {
    if (!isItemLoaded(index)) {
      rangeStopIndex = index;
      if (rangeStartIndex === undefined) {
        rangeStartIndex = index;
      }
    } else if (rangeStartIndex !== undefined && rangeStopIndex !== undefined) {
      unloadedRanges.push({ startIndex: rangeStartIndex, stopIndex: rangeStopIndex });
      rangeStartIndex = undefined;
      rangeStopIndex = undefined;
    }
  }

  if (rangeStartIndex !== undefined && rangeStopIndex !== undefined) {
    unloadedRanges.push({ startIndex: rangeStartIndex, stopIndex: rangeStopIndex });
  }

  return unloadedRanges.reduce<UnloadedRange[]>((ranges, range) => {
    const batchStopIndex = Math.min(
      Math.max(range.stopIndex, range.startIndex + minimumBatchSize - 1),
      itemCount - 1
    );

    for (let index = range.startIndex; index <= batchStopIndex; index++) {
      if (!isItemLoaded(index)) {
        ranges.push({ startIndex: index, stopIndex: batchStopIndex });
        break;
      }
    }

    return ranges;
  }, []);
};

const areRangesEqual = (left: UnloadedRange[], right: UnloadedRange[]) =>
  left.length === right.length &&
  left.every(
    (range, index) =>
      range.startIndex === right[index].startIndex && range.stopIndex === right[index].stopIndex
  );

export const useInfiniteLoader = ({
  isItemLoaded,
  itemCount,
  loadMoreItems,
  minimumBatchSize,
  threshold,
}: UseInfiniteLoaderOptions): ListOnItemsRendered => {
  const previousRanges = useRef<UnloadedRange[]>([]);

  return useCallback(
    ({ visibleStartIndex, visibleStopIndex }: ListOnItemsRenderedProps) => {
      if (visibleStartIndex < 0 || visibleStopIndex < 0 || itemCount === 0) {
        return;
      }

      const unloadedRanges = scanForUnloadedRanges({
        isItemLoaded,
        itemCount,
        minimumBatchSize,
        startIndex: Math.max(0, visibleStartIndex - threshold),
        stopIndex: Math.min(itemCount - 1, visibleStopIndex + threshold),
      });

      if (areRangesEqual(previousRanges.current, unloadedRanges)) {
        return;
      }

      previousRanges.current = unloadedRanges;
      unloadedRanges.forEach(({ startIndex, stopIndex }) => loadMoreItems(startIndex, stopIndex));
    },
    [isItemLoaded, itemCount, loadMoreItems, minimumBatchSize, threshold]
  );
};

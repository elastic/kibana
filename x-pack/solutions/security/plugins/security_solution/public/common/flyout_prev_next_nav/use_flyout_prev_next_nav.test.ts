/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useFlyoutPrevNextNav } from './use_flyout_prev_next_nav';

interface TestItem {
  id: string;
  navigable: boolean;
}

const makeItem = (id: string, navigable = true): TestItem => ({ id, navigable });

const isNavigable = (item: TestItem) => item.navigable;

interface NavProps {
  items: TestItem[];
  openedId?: string;
}

const renderNav = (items: TestItem[], openedItemId?: string, onNavigate = jest.fn()) => {
  const utils = renderHook(
    ({ items: currentItems, openedId }: NavProps) =>
      useFlyoutPrevNextNav({
        items: currentItems,
        openedItemId: openedId,
        isNavigable,
        onNavigate,
      }),
    { initialProps: { items, openedId: openedItemId } }
  );
  return { ...utils, onNavigate };
};

describe('useFlyoutPrevNextNav', () => {
  describe('boundaries with all items navigable', () => {
    const items = [makeItem('1'), makeItem('2'), makeItem('3')];

    it('should report no previous item and an available next item at the start of the list', () => {
      const { result } = renderNav(items, '1');
      expect(result.current.hasPrevious).toBe(false);
      expect(result.current.hasNext).toBe(true);
    });

    it('should move the user to the next item when one is available', () => {
      const { result, onNavigate } = renderNav(items, '1');
      act(() => result.current.goToNext());
      expect(onNavigate).toHaveBeenCalledWith(items[1]);
    });

    it('should keep the user in place when they try to advance past the last item', () => {
      const { result, onNavigate } = renderNav(items, '3');
      act(() => result.current.goToNext());
      expect(onNavigate).not.toHaveBeenCalled();
      expect(result.current.hasNext).toBe(false);
    });

    it('should move the user to the previous item when one is available', () => {
      const { result, onNavigate } = renderNav(items, '3');
      act(() => result.current.goToPrevious());
      expect(onNavigate).toHaveBeenCalledWith(items[1]);
    });

    it('should keep the user in place when they try to go back from the first item', () => {
      const { result, onNavigate } = renderNav(items, '1');
      act(() => result.current.goToPrevious());
      expect(onNavigate).not.toHaveBeenCalled();
      expect(result.current.hasPrevious).toBe(false);
    });
  });

  describe('non-navigable items', () => {
    it('should disable the previous arrow when only non-navigable items are before the opened item', () => {
      const items = [makeItem('F', false), makeItem('A'), makeItem('B')];
      const { result, onNavigate } = renderNav(items, 'A');

      expect(result.current.hasPrevious).toBe(false);
      expect(result.current.hasNext).toBe(true);

      act(() => result.current.goToPrevious());
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('should disable the next arrow when only non-navigable items are after the opened item', () => {
      const items = [makeItem('A'), makeItem('B'), makeItem('F', false)];
      const { result, onNavigate } = renderNav(items, 'B');

      expect(result.current.hasNext).toBe(false);
      expect(result.current.hasPrevious).toBe(true);

      act(() => result.current.goToNext());
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('should skip a non-navigable item in the middle of the list', () => {
      const items = [makeItem('A'), makeItem('F', false), makeItem('B')];
      const { result, rerender, onNavigate } = renderNav(items, 'A');

      act(() => result.current.goToNext());
      expect(onNavigate).toHaveBeenCalledWith(items[2]);

      // onNavigate is a stateless mock here; simulate the consumer applying the navigation.
      rerender({ items, openedId: 'B' });
      act(() => result.current.goToPrevious());
      expect(onNavigate).toHaveBeenCalledWith(items[0]);
    });

    it('should skip consecutive non-navigable items', () => {
      const items = [makeItem('A'), makeItem('F1', false), makeItem('F2', false), makeItem('B')];
      const { result, onNavigate } = renderNav(items, 'A');

      act(() => result.current.goToNext());
      expect(onNavigate).toHaveBeenCalledWith(items[3]);
    });

    it('should disable both arrows when the opened item is the only navigable one', () => {
      const items = [makeItem('F1', false), makeItem('A'), makeItem('F2', false)];
      const { result } = renderNav(items, 'A');

      expect(result.current).toEqual(
        expect.objectContaining({ hasPrevious: false, hasNext: false })
      );
    });
  });

  describe('without a valid opened item', () => {
    const items = [makeItem('1'), makeItem('2')];

    it('should disable both arrows when nothing is open', () => {
      const { result, onNavigate } = renderNav(items, undefined);

      expect(result.current).toEqual(
        expect.objectContaining({ hasPrevious: false, hasNext: false })
      );

      act(() => result.current.goToNext());
      act(() => result.current.goToPrevious());
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('should disable both arrows when the opened id is not in the items', () => {
      const { result, onNavigate } = renderNav(items, 'stale-id');

      expect(result.current).toEqual(
        expect.objectContaining({ hasPrevious: false, hasNext: false })
      );

      act(() => result.current.goToNext());
      act(() => result.current.goToPrevious());
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('should disable both arrows when the opened item is not navigable', () => {
      const { result, onNavigate } = renderNav([makeItem('F', false), ...items], 'F');

      expect(result.current).toEqual(
        expect.objectContaining({ hasPrevious: false, hasNext: false })
      );

      act(() => result.current.goToNext());
      act(() => result.current.goToPrevious());
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('should disable the arrows when the opened item becomes non-navigable on rerender', () => {
      const { result, rerender, onNavigate } = renderNav([makeItem('1'), makeItem('2')], '1');

      expect(result.current.hasNext).toBe(true);

      rerender({ items: [makeItem('1', false), makeItem('2')], openedId: '1' });

      expect(result.current).toEqual(
        expect.objectContaining({ hasPrevious: false, hasNext: false })
      );

      act(() => result.current.goToNext());
      act(() => result.current.goToPrevious());
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });
});

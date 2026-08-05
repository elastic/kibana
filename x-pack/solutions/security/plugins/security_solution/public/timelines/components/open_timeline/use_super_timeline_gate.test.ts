/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { OpenTimelineResult } from './types';
import { useSuperTimelineGate } from './use_super_timeline_gate';
import { MAX_SUPER_TIMELINE_COUNT } from '../super_timeline/use_open_super_timeline';
import {
  SUPER_TIMELINE_TOO_FEW,
  SUPER_TIMELINE_TOO_MANY,
  SUPER_TIMELINE_UNSUPPORTED_QUERY_TYPES,
  ESQL_QUERY_TYPE_LABEL,
  EQL_QUERY_TYPE_LABEL,
} from '../super_timeline/translations';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(() => true),
}));

const mockOpenSuperTimeline = jest.fn();
const mockUseOpenSuperTimeline = jest.fn();

jest.mock('../super_timeline/use_open_super_timeline', () => ({
  useOpenSuperTimeline: (...args: unknown[]) => mockUseOpenSuperTimeline(...args),
  MAX_SUPER_TIMELINE_COUNT: 10,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeItem = (id: string, overrides: Partial<OpenTimelineResult> = {}): OpenTimelineResult => ({
  savedObjectId: id,
  title: `Timeline ${id}`,
  pinnedEventIds: {},
  noteIds: [],
  eventIdToNoteIds: {},
  ...overrides,
});

const makeEsqlItem = (id: string): OpenTimelineResult =>
  makeItem(id, { savedSearchId: `saved-search-${id}` });

const makeEqlItem = (id: string): OpenTimelineResult =>
  makeItem(id, { queryType: { hasQuery: false, hasEql: true } });

const renderGate = (selectedItems: OpenTimelineResult[], searchResults?: OpenTimelineResult[]) =>
  renderHook(() => useSuperTimelineGate({ selectedItems, searchResults }));

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOpenSuperTimeline.mockReturnValue({
    openSuperTimeline: mockOpenSuperTimeline,
    isLoading: false,
  });
});

describe('useSuperTimelineGate', () => {
  describe('isEnabled', () => {
    it('is false when 0 timelines are selected', () => {
      const { result } = renderGate([]);
      expect(result.current.isEnabled).toBe(false);
    });

    it('is false when 1 timeline is selected', () => {
      const { result } = renderGate([makeItem('a')]);
      expect(result.current.isEnabled).toBe(false);
    });

    it('is true when exactly 2 timelines are selected', () => {
      const { result } = renderGate([makeItem('a'), makeItem('b')]);
      expect(result.current.isEnabled).toBe(true);
    });

    it('is true when MAX_SUPER_TIMELINE_COUNT timelines are selected', () => {
      const items = Array.from({ length: MAX_SUPER_TIMELINE_COUNT }, (_, i) => makeItem(`id-${i}`));
      const { result } = renderGate(items);
      expect(result.current.isEnabled).toBe(true);
    });

    it('is false when more than MAX_SUPER_TIMELINE_COUNT timelines are selected', () => {
      const items = Array.from({ length: MAX_SUPER_TIMELINE_COUNT + 1 }, (_, i) =>
        makeItem(`id-${i}`)
      );
      const { result } = renderGate(items);
      expect(result.current.isEnabled).toBe(false);
    });

    it('is false when the selection contains an ES|QL timeline', () => {
      const { result } = renderGate([makeItem('kql'), makeEsqlItem('esql')]);
      expect(result.current.isEnabled).toBe(false);
    });

    it('is false when the selection contains an EQL timeline', () => {
      const { result } = renderGate([makeItem('kql'), makeEqlItem('eql')]);
      expect(result.current.isEnabled).toBe(false);
    });

    it('is false when all selected timelines are ES|QL', () => {
      const { result } = renderGate([makeEsqlItem('esql-1'), makeEsqlItem('esql-2')]);
      expect(result.current.isEnabled).toBe(false);
    });

    it('is false when all selected timelines are EQL', () => {
      const { result } = renderGate([makeEqlItem('eql-1'), makeEqlItem('eql-2')]);
      expect(result.current.isEnabled).toBe(false);
    });

    it('is true for an all-KQL selection within count limits', () => {
      const { result } = renderGate([makeItem('kql-1'), makeItem('kql-2')]);
      expect(result.current.isEnabled).toBe(true);
    });

    it('is false while useOpenSuperTimeline reports isLoading, preventing concurrent requests', () => {
      mockUseOpenSuperTimeline.mockReturnValue({
        openSuperTimeline: mockOpenSuperTimeline,
        isLoading: true,
      });
      const { result } = renderGate([makeItem('a'), makeItem('b')]);
      expect(result.current.isEnabled).toBe(false);
    });

    it('re-enables when the offending ES|QL timeline is deselected', () => {
      const { result, rerender } = renderHook(
        ({ items }: { items: OpenTimelineResult[] }) =>
          useSuperTimelineGate({ selectedItems: items }),
        { initialProps: { items: [makeItem('kql'), makeEsqlItem('esql')] } }
      );
      expect(result.current.isEnabled).toBe(false);
      rerender({ items: [makeItem('kql'), makeItem('kql-2')] });
      expect(result.current.isEnabled).toBe(true);
    });
  });

  describe('tooltip', () => {
    it('returns SUPER_TIMELINE_TOO_FEW when 0 timelines are selected', () => {
      const { result } = renderGate([]);
      expect(result.current.tooltip).toBe(SUPER_TIMELINE_TOO_FEW);
    });

    it('returns SUPER_TIMELINE_TOO_FEW when 1 timeline is selected', () => {
      const { result } = renderGate([makeItem('a')]);
      expect(result.current.tooltip).toBe(SUPER_TIMELINE_TOO_FEW);
    });

    it('returns SUPER_TIMELINE_TOO_MANY when count exceeds MAX_SUPER_TIMELINE_COUNT', () => {
      const items = Array.from({ length: MAX_SUPER_TIMELINE_COUNT + 1 }, (_, i) =>
        makeItem(`id-${i}`)
      );
      const { result } = renderGate(items);
      expect(result.current.tooltip).toBe(SUPER_TIMELINE_TOO_MANY(MAX_SUPER_TIMELINE_COUNT));
    });

    it('names the offending ES|QL timeline and its type so the user can deselect it', () => {
      // The title AND type must both appear — knowing just the title is insufficient for recovery
      // because the user may have multiple timelines with similar names.
      const { result } = renderGate([makeItem('kql-1'), makeEsqlItem('esql-1')]);
      expect(result.current.tooltip).toBe(
        SUPER_TIMELINE_UNSUPPORTED_QUERY_TYPES(`Timeline esql-1 (${ESQL_QUERY_TYPE_LABEL})`)
      );
    });

    it('names the offending EQL timeline and its type', () => {
      const { result } = renderGate([makeItem('kql-1'), makeEqlItem('eql-1')]);
      expect(result.current.tooltip).toBe(
        SUPER_TIMELINE_UNSUPPORTED_QUERY_TYPES(`Timeline eql-1 (${EQL_QUERY_TYPE_LABEL})`)
      );
    });

    it('lists multiple offending timelines separated by a comma', () => {
      const { result } = renderGate([makeEsqlItem('esql-1'), makeEsqlItem('esql-2')]);
      expect(result.current.tooltip).toContain('Timeline esql-1');
      expect(result.current.tooltip).toContain('Timeline esql-2');
    });

    it('returns undefined when the action is enabled', () => {
      const { result } = renderGate([makeItem('a'), makeItem('b')]);
      expect(result.current.tooltip).toBeUndefined();
    });
  });

  describe('handleOpen', () => {
    it('calls openSuperTimeline with the selected savedObjectIds', () => {
      const { result } = renderGate([makeItem('id-1'), makeItem('id-2')]);
      act(() => {
        result.current.handleOpen(() => {});
      });
      expect(mockOpenSuperTimeline).toHaveBeenCalledWith(['id-1', 'id-2']);
    });

    it('calls the closePopover callback', () => {
      const closePopover = jest.fn();
      const { result } = renderGate([makeItem('id-1'), makeItem('id-2')]);
      act(() => {
        result.current.handleOpen(closePopover);
      });
      expect(closePopover).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchResults deduplication', () => {
    it('uses fresh data from searchResults to classify a stale selectedItem', () => {
      // selectedItems has a plain KQL item, but searchResults reveals it now has a savedSearchId
      // (e.g. the user saved an ES|QL query after the list was last fetched). The gate must use
      // the fresher data to prevent an empty Query tab in the Super Timeline.
      const staleItem = makeItem('id-1');
      const freshItem = makeEsqlItem('id-1');
      const { result } = renderHook(() =>
        useSuperTimelineGate({
          selectedItems: [staleItem, makeItem('id-2')],
          searchResults: [freshItem, makeItem('id-2')],
        })
      );
      expect(result.current.isEnabled).toBe(false);
    });
  });
});

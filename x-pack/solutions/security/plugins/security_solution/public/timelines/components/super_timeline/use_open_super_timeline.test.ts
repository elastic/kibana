/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { TimelineId, TimelineTabs } from '../../../../common/types/timeline';
import { TimelineStatusEnum } from '../../../../common/api/timeline';
import type { TimelineModel } from '../../store/model';
import { timelineDefaults } from '../../store/defaults';
import { MAX_SUPER_TIMELINE_COUNT, useOpenSuperTimeline } from './use_open_super_timeline';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAddWarning = jest.fn();
const mockAddError = jest.fn();
const mockOpenConfirm = jest.fn();
const mockUpdateTimeline = jest.fn();
const mockResolveTimeline = jest.fn();
const mockFormatTimelineResponseToModel = jest.fn();
const mockBuildSuperTimelineModel = jest.fn();

// Active timeline state — mutated per test; referenced inside the factory via closure.
// The key 'timeline-1' is the literal value of TimelineId.active (enum checked in index.ts).
let mockActiveTimeline: Partial<TimelineModel> = {};

jest.mock('react-redux-v7', () => ({
  ...jest.requireActual('react-redux-v7'),
  useSelector: (selector: (s: unknown) => unknown) =>
    selector({
      timeline: {
        timelineById: {
          'timeline-1': mockActiveTimeline,
        },
      },
    }),
}));

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      uiSettings: {},
      notifications: { toasts: { addWarning: mockAddWarning, addError: mockAddError } },
      overlays: { openConfirm: mockOpenConfirm },
    },
  }),
}));

jest.mock('@kbn/data-plugin/common', () => ({
  getEsQueryConfig: () => ({ allowLeadingWildcards: true, queryStringOptions: {} }),
}));

jest.mock('../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: () => ({ dataView: { id: 'mock-dv', fields: [] }, status: 'ready' }),
}));

jest.mock('../../../data_view_manager/hooks/use_browser_fields', () => ({
  useBrowserFields: () => ({}),
}));

jest.mock('../open_timeline/use_update_timeline', () => ({
  useUpdateTimeline: () => mockUpdateTimeline,
}));

jest.mock('../../containers/api', () => ({
  resolveTimeline: (...args: unknown[]) => mockResolveTimeline(...args),
}));

jest.mock('../open_timeline/helpers', () => ({
  formatTimelineResponseToModel: (...args: unknown[]) => mockFormatTimelineResponseToModel(...args),
}));

jest.mock('./build_super_timeline_model', () => ({
  buildSuperTimelineModel: (...args: unknown[]) => mockBuildSuperTimelineModel(...args),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeMergedModel = (overrides: Partial<TimelineModel> = {}): TimelineModel => ({
  ...(timelineDefaults as unknown as TimelineModel),
  id: '',
  title: 'Super Timeline',
  isSuperTimeline: true,
  superTimelineSourceIds: ['id-1', 'id-2'],
  savedObjectId: null,
  dateRange: { start: '2024-01-01T00:00:00.000Z', end: '2024-01-07T00:00:00.000Z' },
  filters: [],
  ...overrides,
});

const makeRawTimeline = (id: string) => ({
  savedObjectId: id,
  title: `Timeline ${id}`,
  pinnedEventIds: {},
});

const setupHappyPath = (ids: string[] = ['id-1', 'id-2']) => {
  ids.forEach((id) => {
    mockResolveTimeline.mockResolvedValueOnce({ timeline: makeRawTimeline(id) });
    mockFormatTimelineResponseToModel.mockReturnValueOnce({
      timeline: { ...timelineDefaults, id: '', savedObjectId: id } as TimelineModel,
      notes: [],
    });
  });
  mockBuildSuperTimelineModel.mockReturnValue({
    model: makeMergedModel(),
    skippedQueryTimelines: [],
  });
};

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockActiveTimeline = {};
  mockOpenConfirm.mockResolvedValue(true);
});

describe('useOpenSuperTimeline', () => {
  describe('selection cap guard', () => {
    it('shows a warning toast and returns early when more than MAX timelines are selected', async () => {
      const ids = Array.from({ length: MAX_SUPER_TIMELINE_COUNT + 1 }, (_, i) => `id-${i}`);
      const { result } = renderHook(() => useOpenSuperTimeline());

      await act(async () => {
        await result.current.openSuperTimeline(ids);
      });

      expect(mockAddWarning).toHaveBeenCalledTimes(1);
      expect(mockResolveTimeline).not.toHaveBeenCalled();
    });

    it('shows a warning toast when fewer than 2 timelines are selected', async () => {
      const { result } = renderHook(() => useOpenSuperTimeline());

      await act(async () => {
        await result.current.openSuperTimeline(['id-1']);
      });

      expect(mockAddWarning).toHaveBeenCalledTimes(1);
      expect(mockResolveTimeline).not.toHaveBeenCalled();
    });

    it('accepts exactly MAX timelines without showing a cap warning', async () => {
      const ids = Array.from({ length: MAX_SUPER_TIMELINE_COUNT }, (_, i) => `id-${i}`);
      setupHappyPath(ids);

      const { result } = renderHook(() => useOpenSuperTimeline());
      await act(async () => {
        await result.current.openSuperTimeline(ids);
      });

      expect(mockAddWarning).not.toHaveBeenCalled();
      expect(mockResolveTimeline).toHaveBeenCalledTimes(MAX_SUPER_TIMELINE_COUNT);
    });
  });

  describe('overwrite guard', () => {
    it('shows a confirm dialog when active timeline has unsaved changes (changed: true)', async () => {
      mockActiveTimeline = { changed: true, status: TimelineStatusEnum.draft };
      mockOpenConfirm.mockResolvedValue(true);
      setupHappyPath();

      const { result } = renderHook(() => useOpenSuperTimeline());
      await act(async () => {
        await result.current.openSuperTimeline(['id-1', 'id-2']);
      });

      expect(mockOpenConfirm).toHaveBeenCalledTimes(1);
      expect(mockResolveTimeline).toHaveBeenCalledTimes(2);
    });

    it('shows a confirm dialog when active timeline is a draft with an update timestamp', async () => {
      mockActiveTimeline = {
        changed: false,
        status: TimelineStatusEnum.draft,
        updated: 1234567890,
      };
      mockOpenConfirm.mockResolvedValue(true);
      setupHappyPath();

      const { result } = renderHook(() => useOpenSuperTimeline());
      await act(async () => {
        await result.current.openSuperTimeline(['id-1', 'id-2']);
      });

      expect(mockOpenConfirm).toHaveBeenCalledTimes(1);
    });

    it('aborts when the user cancels the overwrite confirmation', async () => {
      mockActiveTimeline = { changed: true };
      mockOpenConfirm.mockResolvedValue(false);

      const { result } = renderHook(() => useOpenSuperTimeline());
      await act(async () => {
        await result.current.openSuperTimeline(['id-1', 'id-2']);
      });

      expect(mockOpenConfirm).toHaveBeenCalledTimes(1);
      expect(mockResolveTimeline).not.toHaveBeenCalled();
      expect(mockUpdateTimeline).not.toHaveBeenCalled();
    });

    it('skips the confirm dialog when the active timeline has no unsaved changes', async () => {
      mockActiveTimeline = { changed: false, status: TimelineStatusEnum.active };
      setupHappyPath();

      const { result } = renderHook(() => useOpenSuperTimeline());
      await act(async () => {
        await result.current.openSuperTimeline(['id-1', 'id-2']);
      });

      expect(mockOpenConfirm).not.toHaveBeenCalled();
    });
  });

  describe('parallel fetch and model build', () => {
    it('fetches all source timelines in parallel and opens the super timeline', async () => {
      setupHappyPath();

      const { result } = renderHook(() => useOpenSuperTimeline());
      await act(async () => {
        await result.current.openSuperTimeline(['id-1', 'id-2']);
      });

      expect(mockResolveTimeline).toHaveBeenCalledTimes(2);
      expect(mockResolveTimeline).toHaveBeenCalledWith('id-1');
      expect(mockResolveTimeline).toHaveBeenCalledWith('id-2');
      expect(mockBuildSuperTimelineModel).toHaveBeenCalledTimes(1);
    });

    it('dispatches the merged model into the active timeline slot with show: true', async () => {
      setupHappyPath();

      const { result } = renderHook(() => useOpenSuperTimeline());
      await act(async () => {
        await result.current.openSuperTimeline(['id-1', 'id-2']);
      });

      expect(mockUpdateTimeline).toHaveBeenCalledTimes(1);
      const call = mockUpdateTimeline.mock.calls[0][0];
      expect(call.id).toBe(TimelineId.active);
      expect(call.timeline.show).toBe(true);
      expect(call.timeline.isSuperTimeline).toBe(true);
      expect(call.timeline.activeTab).toBe(TimelineTabs.query);
      expect(call.duplicate).toBe(false);
      expect(call.preventSettingQuery).toBe(true);
    });

    it('never calls updateTimeline with a savedObjectId (super timeline is transient)', async () => {
      setupHappyPath();

      const { result } = renderHook(() => useOpenSuperTimeline());
      await act(async () => {
        await result.current.openSuperTimeline(['id-1', 'id-2']);
      });

      const call = mockUpdateTimeline.mock.calls[0][0];
      expect(call.timeline.savedObjectId).toBeNull();
    });
  });

  describe('EQL/ESQL skipped-query toast', () => {
    it('shows a warning toast naming EQL/ESQL timelines when skippedQueryTimelines is non-empty', async () => {
      setupHappyPath();
      mockBuildSuperTimelineModel.mockReturnValue({
        model: makeMergedModel(),
        skippedQueryTimelines: [
          { id: 'eql-id', title: 'EQL Investigation', reason: 'eql' as const },
        ],
      });

      const { result } = renderHook(() => useOpenSuperTimeline());
      await act(async () => {
        await result.current.openSuperTimeline(['id-1', 'id-2']);
      });

      expect(mockAddWarning).toHaveBeenCalledTimes(1);
      const warningText = mockAddWarning.mock.calls[0][0].text as string;
      expect(warningText).toContain('EQL Investigation');
    });

    it('shows no toast when all timelines contribute KQL queries', async () => {
      setupHappyPath();

      const { result } = renderHook(() => useOpenSuperTimeline());
      await act(async () => {
        await result.current.openSuperTimeline(['id-1', 'id-2']);
      });

      expect(mockAddWarning).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('shows warning toasts (not an error) when all resolveTimeline calls reject', async () => {
      // WHY: with Promise.allSettled a single failure should not abort the whole batch.
      // When all fail we surface which IDs failed and a "too few loaded" guard — not a generic error.
      mockResolveTimeline.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useOpenSuperTimeline());
      await act(async () => {
        await result.current.openSuperTimeline(['id-1', 'id-2']);
      });

      expect(mockAddError).not.toHaveBeenCalled();
      expect(mockAddWarning).toHaveBeenCalledTimes(2); // partial-fetch warning + too-few warning
      expect(mockUpdateTimeline).not.toHaveBeenCalled();
    });

    it('shows a partial-fetch warning but still opens when enough timelines succeed', async () => {
      // WHY: one deleted/unavailable timeline should not block the rest from aggregating.
      mockResolveTimeline.mockRejectedValueOnce(new Error('Not found'));
      mockResolveTimeline.mockResolvedValueOnce({ timeline: makeRawTimeline('id-2') });
      mockResolveTimeline.mockResolvedValueOnce({ timeline: makeRawTimeline('id-3') });
      mockFormatTimelineResponseToModel.mockReturnValue({
        timeline: { ...timelineDefaults, id: '', savedObjectId: 'id-2' } as TimelineModel,
        notes: [],
      });
      mockBuildSuperTimelineModel.mockReturnValue({
        model: makeMergedModel({ superTimelineSourceIds: ['id-2', 'id-3'] }),
        skippedQueryTimelines: [],
      });

      const { result } = renderHook(() => useOpenSuperTimeline());
      await act(async () => {
        await result.current.openSuperTimeline(['id-1', 'id-2', 'id-3']);
      });

      expect(mockAddWarning).toHaveBeenCalledTimes(1);
      const warningTitle = mockAddWarning.mock.calls[0][0].title as string;
      expect(warningTitle).toContain('could not be loaded');
      expect(mockUpdateTimeline).toHaveBeenCalledTimes(1);
    });

    it('resets isLoading to false when all fetches fail', async () => {
      mockResolveTimeline.mockRejectedValue(new Error('boom'));

      const { result } = renderHook(() => useOpenSuperTimeline());
      await act(async () => {
        await result.current.openSuperTimeline(['id-1', 'id-2']);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('isLoading state', () => {
    it('is false before opening and false after successful open', async () => {
      setupHappyPath();

      const { result } = renderHook(() => useOpenSuperTimeline());
      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.openSuperTimeline(['id-1', 'id-2']);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});

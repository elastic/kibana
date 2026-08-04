/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  hasTimelineStateChanged,
  useInitTimelineFromUrlParam,
} from './use_init_timeline_url_param';
import { timelineDefaults } from '../../../timelines/store/defaults';
import { TimelineTabs } from '../../../../common/types/timeline';
import type { TimelineModel } from '../../../timelines/store/model';

// ── Mocks needed for the hook tests ──────────────────────────────────────────

const mockOpenSuperTimeline = jest.fn();
const mockQueryTimelineById = jest.fn();
let mockInitializeCallback: ((state: unknown) => void) | null = null;

jest.mock('../use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(() => true),
}));

jest.mock('../../utils/global_query_string', () => ({
  useInitializeUrlParam: jest.fn((_key: string, cb: (state: unknown) => void) => {
    mockInitializeCallback = cb;
  }),
}));

jest.mock('../../../timelines/components/open_timeline/helpers', () => ({
  useQueryTimelineById: () => mockQueryTimelineById,
}));

jest.mock('../../../timelines/components/super_timeline/use_open_super_timeline', () => ({
  useOpenSuperTimeline: () => ({
    openSuperTimeline: mockOpenSuperTimeline,
    isLoading: false,
  }),
}));

jest.mock('react-redux-v7', () => ({
  ...jest.requireActual('react-redux-v7'),
  useSelector: () => null,
}));

import { useIsExperimentalFeatureEnabled } from '../use_experimental_features';

const activeTimeline: TimelineModel = {
  ...timelineDefaults,
  id: 'timeline-1',
  savedObjectId: 'abc-123',
  savedSearchId: null,
  superTimelineSourceIds: [],
};

describe('hasTimelineStateChanged', () => {
  // These tests encode WHY the guard exists: a popstate event carrying the same timeline
  // param must NOT trigger a reload, which would discard in-progress unsaved edits.
  // Before this fix the condition was inverted (`!hasTimelineStateChanged`), so a same-URL
  // popstate always re-loaded the timeline and silently overwrote unsaved edits.

  it('returns falsy when activeTimeline is null — caller treats this as "no existing state, initialize"', () => {
    expect(
      hasTimelineStateChanged(null, { id: 'abc-123', isOpen: true, activeTab: TimelineTabs.query })
    ).toBeFalsy();
  });

  it('returns falsy when newState is null — nothing to initialize from', () => {
    expect(hasTimelineStateChanged(activeTimeline, null)).toBeFalsy();
  });

  it('returns false when savedObjectId, savedSearchId, and superTimelineSourceIds are all the same', () => {
    expect(
      hasTimelineStateChanged(activeTimeline, {
        id: 'abc-123',
        isOpen: true,
        activeTab: TimelineTabs.query,
        superTimelineSourceIds: [],
      })
    ).toBe(false);
  });

  it('returns true when savedObjectId differs — different timeline navigated to via popstate', () => {
    expect(
      hasTimelineStateChanged(activeTimeline, {
        id: 'different-id',
        isOpen: true,
        activeTab: TimelineTabs.query,
      })
    ).toBe(true);
  });

  it('returns true when savedSearchId differs', () => {
    expect(
      hasTimelineStateChanged(
        { ...activeTimeline, savedSearchId: null },
        { id: 'abc-123', isOpen: true, activeTab: TimelineTabs.query, savedSearchId: 'search-1' }
      )
    ).toBe(true);
  });

  it('returns true when superTimelineSourceIds differ', () => {
    expect(
      hasTimelineStateChanged(
        { ...activeTimeline, superTimelineSourceIds: ['id-1', 'id-2'] },
        {
          id: 'abc-123',
          isOpen: true,
          activeTab: TimelineTabs.query,
          superTimelineSourceIds: ['id-1'],
        }
      )
    ).toBe(true);
  });

  it('returns false when superTimelineSourceIds are the same but in a different order (order-insensitive)', () => {
    expect(
      hasTimelineStateChanged(
        { ...activeTimeline, superTimelineSourceIds: ['id-2', 'id-1'] },
        {
          id: 'abc-123',
          isOpen: true,
          activeTab: TimelineTabs.query,
          superTimelineSourceIds: ['id-1', 'id-2'],
        }
      )
    ).toBe(false);
  });

  it('returns false for an active Super Timeline when the URL carries the same sourceIds (savedObjectId null vs id undefined)', () => {
    // WHY: Super Timelines have savedObjectId: null (transient, never persisted). The URL sync
    // omits 'id' when isSuperTimeline is true, so parsedState.id is undefined. The old comparison
    // (null !== undefined → true) always returned true, causing openSuperTimeline to re-fire on
    // every back/forward navigation. The ?? null normalization makes null === undefined for this
    // comparison, matching the savedSearchId fix already in this function.
    const superTimeline: TimelineModel = {
      ...activeTimeline,
      savedObjectId: null,
      superTimelineSourceIds: ['src-1', 'src-2'],
    };
    expect(
      hasTimelineStateChanged(superTimeline, {
        isOpen: true,
        activeTab: TimelineTabs.query,
        superTimelineSourceIds: ['src-1', 'src-2'],
      })
    ).toBe(false);
  });

  it('returns true for an active Super Timeline when the sourceIds change (navigation to different Super Timeline)', () => {
    const superTimeline: TimelineModel = {
      ...activeTimeline,
      savedObjectId: null,
      superTimelineSourceIds: ['src-1', 'src-2'],
    };
    expect(
      hasTimelineStateChanged(superTimeline, {
        isOpen: true,
        activeTab: TimelineTabs.query,
        superTimelineSourceIds: ['src-1', 'src-3'],
      })
    ).toBe(true);
  });
});

describe('useInitTimelineFromUrlParam — feature flag gate', () => {
  // WHY: every other Super Timeline entry point guards with useIsExperimentalFeatureEnabled.
  // The URL-param path bypassed this check — any URL carrying superTimelineSourceIds would
  // fire openSuperTimeline (network requests + model rebuild) even when the flag is off.

  beforeEach(() => {
    jest.clearAllMocks();
    mockInitializeCallback = null;
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
  });

  const renderUrlParamHook = () => {
    renderHook(() => useInitTimelineFromUrlParam());
    return mockInitializeCallback!;
  };

  it('calls openSuperTimeline when superTimelineSourceIds are present and flag is enabled', () => {
    const onInitialize = renderUrlParamHook();
    onInitialize({ superTimelineSourceIds: ['tl-1', 'tl-2'], isOpen: true });
    expect(mockOpenSuperTimeline).toHaveBeenCalledWith(['tl-1', 'tl-2']);
    expect(mockQueryTimelineById).not.toHaveBeenCalled();
  });

  it('does NOT call openSuperTimeline when flag is disabled — guards stale Super Timeline URLs', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    const onInitialize = renderUrlParamHook();
    onInitialize({ superTimelineSourceIds: ['tl-1', 'tl-2'], isOpen: true });
    expect(mockOpenSuperTimeline).not.toHaveBeenCalled();
    // Also does not fall through to queryTimelineById with undefined id
    expect(mockQueryTimelineById).not.toHaveBeenCalled();
  });

  it('calls queryTimelineById for a regular timeline regardless of the flag', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    const onInitialize = renderUrlParamHook();
    onInitialize({ id: 'some-saved-id', isOpen: true, activeTab: TimelineTabs.query });
    expect(mockQueryTimelineById).toHaveBeenCalledWith(
      expect.objectContaining({ timelineId: 'some-saved-id' })
    );
    expect(mockOpenSuperTimeline).not.toHaveBeenCalled();
  });
});

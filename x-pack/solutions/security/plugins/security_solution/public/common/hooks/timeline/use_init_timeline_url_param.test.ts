/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasTimelineStateChanged } from './use_init_timeline_url_param';
import { timelineDefaults } from '../../../timelines/store/defaults';
import { TimelineTabs } from '../../../../common/types/timeline';
import type { TimelineModel } from '../../../timelines/store/model';

const activeTimeline: TimelineModel = {
  ...timelineDefaults,
  id: 'timeline-1',
  savedObjectId: 'abc-123',
  savedSearchId: null,
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

  it('returns false when savedObjectId and savedSearchId are both the same', () => {
    expect(
      hasTimelineStateChanged(activeTimeline, {
        id: 'abc-123',
        isOpen: true,
        activeTab: TimelineTabs.query,
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
});

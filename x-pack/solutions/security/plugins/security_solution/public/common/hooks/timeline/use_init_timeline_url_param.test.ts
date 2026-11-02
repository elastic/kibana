/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux-v7';
import {
  hasTimelineStateChanged,
  useInitTimelineFromUrlParam,
} from './use_init_timeline_url_param';
import { TimelineId } from '../../../../common/types';
import { createMockStore } from '../../mock';
import { timelineActions } from '../../../timelines/store';
import { selectTimelineById } from '../../../timelines/store/selectors';
import { timelineDefaults } from '../../../timelines/store/defaults';
import { TimelineTabs } from '../../../../common/types/timeline';
import type { TimelineModel, TimelineUrl } from '../../../timelines/store/model';

let mockUrlState: TimelineUrl | null = null;

jest.mock('../../utils/global_query_string', () => ({
  // Mirrors the real hook: calls the initializer once on mount with the parsed URL param.
  useInitializeUrlParam: (_key: string, onInitialize: (state: unknown) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useEffect } = require('react');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => onInitialize(mockUrlState), []);
  },
}));

// Mirrors `useQueryTimelineById` for a timeline without a saved object: it applies the URL query,
// which the `timelineChangedMiddleware` turns into `changed: true`.
jest.mock('../../../timelines/components/open_timeline/helpers', () => ({
  useQueryTimelineById: () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useDispatch: useReduxDispatch } = require('react-redux-v7');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { timelineActions: actions } = require('../../../timelines/store');
    const dispatch = useReduxDispatch();
    return () =>
      dispatch(
        actions.applyKqlFilterQuery({
          id: 'timeline-1',
          filterQuery: {
            kuery: { kind: 'kuery', expression: 'service.name: "a"' },
            serializedQuery: '',
          },
        })
      );
  },
}));

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

describe('useInitTimelineFromUrlParam', () => {
  const renderInit = (store: ReturnType<typeof createMockStore>) =>
    renderHook(() => useInitTimelineFromUrlParam(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) =>
        React.createElement(Provider, { store }, children),
    });

  const getTimeline = (store: ReturnType<typeof createMockStore>) =>
    selectTimelineById(store.getState(), TimelineId.active);

  it('keeps an earlier prompt dismissal when it rebuilds the timeline from the URL', () => {
    // Real flow: the user confirmed leaving, then came back (browser back) to a URL that still
    // carries the `timeline` param. Re-applying its query must neither bring the prompt back
    // nor clear `changed`, which drives the unsaved badge and the overwrite guard.
    const store = createMockStore();
    store.dispatch(timelineActions.updateProviders({ id: TimelineId.active, providers: [] }));
    store.dispatch(
      timelineActions.setSavePromptDismissed({ id: TimelineId.active, dismissed: true })
    );
    mockUrlState = { isOpen: false, activeTab: TimelineTabs.query };

    renderInit(store);

    expect(getTimeline(store).changed).toBe(true);
    expect(getTimeline(store).savePromptDismissed).toBe(true);
  });

  it('does not dismiss the prompt when the user had not confirmed leaving', () => {
    const store = createMockStore();
    store.dispatch(timelineActions.updateProviders({ id: TimelineId.active, providers: [] }));
    mockUrlState = { isOpen: false, activeTab: TimelineTabs.query };

    renderInit(store);

    expect(getTimeline(store).changed).toBe(true);
    expect(getTimeline(store).savePromptDismissed).toBeFalsy();
  });

  it('does not touch the timeline when the URL has no timeline param', () => {
    const store = createMockStore();
    store.dispatch(timelineActions.updateProviders({ id: TimelineId.active, providers: [] }));
    mockUrlState = null;

    renderInit(store);

    expect(getTimeline(store).changed).toBe(true);
    expect(getTimeline(store).savePromptDismissed).toBeFalsy();
  });
});

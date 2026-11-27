/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { APP_STATE_URL_KEY, GLOBAL_STATE_URL_KEY } from '@kbn/discover-plugin/common';
import type { CustomizationCallback } from '@kbn/discover-plugin/public/customizations/types';
import type { DiscoverContainerProps } from '@kbn/discover-plugin/public';
import type { DiscoverAppState } from '@kbn/discover-plugin/public/application/main/state_management/redux';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import { createMockStore, mockGlobalState, TestProviders } from '../../../../../common/mock';
import { createStartServicesMock } from '../../../../../common/lib/kibana/kibana_react.mock';
import type { DiscoverInTimelineContextType } from '../../../../../common/components/discover_in_timeline/context';
import { DiscoverInTimelineContext } from '../../../../../common/components/discover_in_timeline/context';
import type { TimelineRestore } from '../../../../../common/components/discover_in_timeline/use_discover_in_timeline_actions';
import { defaultDiscoverTimeRange } from '../../../../../common/components/discover_in_timeline/use_discover_in_timeline_actions';
import DiscoverTabContent from '.';
import { TimelineId } from '../../../../../../common/types';
import {
  createTimelineDiscoverTestState,
  setCurrentTabAppState,
} from './mocks/discover_test_state';

/** The state of the timeline the user is looking at, as Discover left it before the remount. */
const IN_SESSION_APP_STATE: DiscoverAppState = {
  query: { esql: 'from auditbeat-* | where ecs.version == "8.0.0"' },
  columns: ['event.category'],
};
const IN_SESSION_TIME_RANGE = {
  from: '2021-01-18T20:33:29.186Z',
  to: '2024-01-19T20:33:29.186Z',
  mode: 'absolute' as const,
};

const DEFAULT_APP_STATE: DiscoverAppState = { query: { esql: '' }, columns: [] };

/** The timeline's saved Discover session, older than what the user has on screen. */
const SAVED_SESSION_APP_STATE: DiscoverAppState = {
  query: { esql: 'from logs-* | limit 10' },
  columns: ['host.name'],
};
const SAVED_SESSION_TIME_RANGE = { from: 'now-7d', to: 'now', mode: 'relative' as const };
const SAVED_SESSION_ID = 'saved-session-id';
const SAVED_SESSION = {
  id: SAVED_SESSION_ID,
  timeRange: SAVED_SESSION_TIME_RANGE,
} as unknown as SavedSearch;

const createStoreWithSavedSession = () =>
  createMockStore({
    ...mockGlobalState,
    timeline: {
      ...mockGlobalState.timeline,
      timelineById: {
        ...mockGlobalState.timeline.timelineById,
        [TimelineId.test]: {
          ...mockGlobalState.timeline.timelineById[TimelineId.test],
          savedSearchId: SAVED_SESSION_ID,
        },
      },
    },
  });

const renderEsqlTab = async ({
  timelineRestorePending,
  urlAppState = IN_SESSION_APP_STATE,
  currentTabAppState = IN_SESSION_APP_STATE,
  hasSavedSession = false,
}: {
  timelineRestorePending: TimelineRestore | null;
  urlAppState?: DiscoverAppState;
  currentTabAppState?: DiscoverAppState;
  hasSavedSession?: boolean;
}) => {
  const discoverState = await createTimelineDiscoverTestState({
    urlAppState,
    urlTimeRange: IN_SESSION_TIME_RANGE,
  });
  setCurrentTabAppState(discoverState.stateContainer, currentTabAppState);

  const startServices = createStartServicesMock();
  const DiscoverContainer = jest.fn<React.ReactElement, [DiscoverContainerProps]>(() => (
    <div data-test-subj="discover-container" />
  ));
  startServices.discover = { ...startServices.discover, DiscoverContainer };
  startServices.savedSearch.get = jest.fn().mockResolvedValue(SAVED_SESSION);

  const restorePendingRef = { current: timelineRestorePending };
  const contextValue = {
    discoverStateContainer: { current: undefined },
    setDiscoverStateContainer: jest.fn(),
    resetDiscoverAppState: jest.fn(),
    updateSavedSearch: jest.fn(),
    initializeLocalSavedSearch: jest.fn(),
    getAppStateFromSavedSearch: jest
      .fn()
      .mockReturnValue({ savedSearch: SAVED_SESSION, appState: SAVED_SESSION_APP_STATE }),
    defaultDiscoverAppState: DEFAULT_APP_STATE,
    timelineRestorePending: restorePendingRef,
  } as unknown as DiscoverInTimelineContextType;

  render(
    <TestProviders
      startServices={startServices}
      store={hasSavedSession ? createStoreWithSavedSession() : undefined}
    >
      <DiscoverInTimelineContext.Provider value={contextValue}>
        <DiscoverTabContent timelineId={TimelineId.test} />
      </DiscoverInTimelineContext.Provider>
    </TestProviders>
  );

  await waitFor(() => expect(DiscoverContainer).toHaveBeenCalled());

  const { customizationCallbacks } = DiscoverContainer.mock.calls[0][0];

  await act(async () => {
    await customizationCallbacks[0]({
      stateContainer: discoverState.stateContainer,
    } as unknown as Parameters<CustomizationCallback>[0]);
  });

  return { ...discoverState, restorePendingRef };
};

describe('Discover Tab Content', () => {
  it('should render', async () => {
    render(
      <TestProviders>
        <DiscoverTabContent timelineId={TimelineId.test} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('timeline-embedded-discover')).toBeInTheDocument();
    });
  });

  // The tab unmounts whenever the user leaves it, so mounting is not on its own a signal that a
  // timeline is being opened. Treating it as one turns every Query → ES|QL round trip into a
  // restore, throwing away unsaved queries and moving the time range back to `now-15m`.
  describe('remounting for the timeline already on screen', () => {
    it('leaves the state Discover holds alone', async () => {
      const { stateStorageContainer } = await renderEsqlTab({ timelineRestorePending: null });

      expect(stateStorageContainer.get(APP_STATE_URL_KEY)).toEqual(IN_SESSION_APP_STATE);
      expect(stateStorageContainer.get(GLOBAL_STATE_URL_KEY)).toEqual(
        expect.objectContaining({ time: IN_SESSION_TIME_RANGE })
      );
    });

    it('keeps the time range the ES|QL search runs against when it has to seed the tab', async () => {
      const { stateStorageContainer } = await renderEsqlTab({
        timelineRestorePending: null,
        // Nothing of this timeline's own session is in the URL, so seeding it cannot lose work —
        // but the range the user is looking at still has to survive.
        urlAppState: { columns: ['stale'] },
        currentTabAppState: { columns: ['stale'] },
      });

      expect(stateStorageContainer.get(GLOBAL_STATE_URL_KEY)).toEqual(
        expect.objectContaining({ time: IN_SESSION_TIME_RANGE })
      );
    });

    it('keeps the live time range over the saved session one when it seeds the tab from it', async () => {
      const { stateStorageContainer } = await renderEsqlTab({
        timelineRestorePending: null,
        hasSavedSession: true,
        urlAppState: { columns: ['stale'] },
        currentTabAppState: { columns: ['stale'] },
      });

      expect(stateStorageContainer.get(APP_STATE_URL_KEY)).toEqual(
        expect.objectContaining({ columns: SAVED_SESSION_APP_STATE.columns })
      );
      expect(stateStorageContainer.get(GLOBAL_STATE_URL_KEY)).toEqual(
        expect.objectContaining({ time: IN_SESSION_TIME_RANGE })
      );
    });
  });

  // A page reload restores the timeline in the URL before Discover has mounted, so its restore is
  // still pending when the tab mounts — but the Discover state in the URL is this timeline's own.
  describe('mounting after the timeline the URL points at was restored', () => {
    it('keeps its unsaved ES|QL work from the URL over the saved session', async () => {
      const { stateStorageContainer, restorePendingRef } = await renderEsqlTab({
        timelineRestorePending: 'fromUrl',
        hasSavedSession: true,
      });

      expect(stateStorageContainer.get(APP_STATE_URL_KEY)).toEqual(IN_SESSION_APP_STATE);
      expect(stateStorageContainer.get(GLOBAL_STATE_URL_KEY)).toEqual(
        expect.objectContaining({ time: IN_SESSION_TIME_RANGE })
      );
      expect(restorePendingRef.current).toBeNull();
    });
  });

  describe('mounting after a different timeline was opened', () => {
    it('replaces the state the previous timeline left behind', async () => {
      const { stateStorageContainer, restorePendingRef } = await renderEsqlTab({
        timelineRestorePending: 'opened',
      });

      expect(stateStorageContainer.get(APP_STATE_URL_KEY)).toEqual(
        expect.not.objectContaining({ query: IN_SESSION_APP_STATE.query })
      );
      expect(stateStorageContainer.get(GLOBAL_STATE_URL_KEY)).toEqual(
        expect.objectContaining({ time: defaultDiscoverTimeRange })
      );
      // Consumed, so the next remount of this timeline is not treated as a restore.
      expect(restorePendingRef.current).toBeNull();
    });

    it('restores the saved session state and time range of the opened timeline', async () => {
      const { stateStorageContainer } = await renderEsqlTab({
        timelineRestorePending: 'opened',
        hasSavedSession: true,
      });

      expect(stateStorageContainer.get(APP_STATE_URL_KEY)).toEqual(
        expect.objectContaining(SAVED_SESSION_APP_STATE)
      );
      expect(stateStorageContainer.get(GLOBAL_STATE_URL_KEY)).toEqual(
        expect.objectContaining({ time: SAVED_SESSION_TIME_RANGE })
      );
    });
  });

  // `DiscoverContainer` is mocked here (see `discoverPluginMock`), so these tests drive the
  // customization callback by hand. Whether the state it writes survives Discover's own tab
  // initialization — which prefers the range already in the URL — is covered in
  // `apply_timeline_state_to_discover.test.ts`.
  //
  // Still uncovered, tracked by https://github.com/elastic/kibana/issues/165913:
  it.skip('should update saved search if timeline title and description are updated', () => {});
  it.skip('should should not update saved search if the fetched saved search is same as discover updated saved search', () => {});
});

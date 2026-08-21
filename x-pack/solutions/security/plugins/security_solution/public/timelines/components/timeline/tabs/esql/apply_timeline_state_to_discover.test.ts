/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { APP_STATE_URL_KEY, GLOBAL_STATE_URL_KEY } from '@kbn/discover-plugin/common';
import { createDiscoverServicesMock } from '@kbn/discover-plugin/public/__mocks__/services';
import { getDiscoverInternalStateMock } from '@kbn/discover-plugin/public/__mocks__/discover_state.mock';
import { getExtendedDiscoverStateContainer } from '@kbn/discover-plugin/public/customizations';
import {
  createTabActionInjector,
  selectTab,
  type DiscoverAppState,
} from '@kbn/discover-plugin/public/application/main/state_management/redux';

import { applyTimelineStateToDiscover } from './apply_timeline_state_to_discover';

const RESTORED_TIME_RANGE = {
  from: '2021-01-18T20:33:29.186Z',
  to: '2024-01-19T20:33:29.186Z',
  mode: 'absolute' as const,
};

/** What a previously opened timeline leaves behind in the security URL. */
const PREVIOUS_TIMELINE_TIME_RANGE = { from: 'now-15m', to: 'now', mode: 'relative' as const };

const restoredAppState: DiscoverAppState = {
  query: { esql: 'from auditbeat-* | where ecs.version == "8.0.0"' },
  columns: ['event.category', 'ecs.version'],
};

const setup = async () => {
  const services = createDiscoverServicesMock();
  const toolkit = getDiscoverInternalStateMock({
    services,
    persistedDataViews: [dataViewMockWithTimeField],
  });

  await toolkit.initializeTabs();

  const tabId = toolkit.internalState.getState().tabs.unsafeCurrentId;
  const stateContainer = getExtendedDiscoverStateContainer({
    internalState: toolkit.internalState,
    injectCurrentTab: createTabActionInjector(tabId),
    getCurrentTab: () => selectTab(toolkit.internalState.getState(), tabId),
    runtimeStateManager: toolkit.runtimeStateManager,
    stateStorage: toolkit.stateStorageContainer,
    services,
  });

  // Whatever the previously opened timeline synced into the URL is still there when the ES|QL tab
  // mounts for the next one.
  await toolkit.stateStorageContainer.set(
    GLOBAL_STATE_URL_KEY,
    { time: PREVIOUS_TIMELINE_TIME_RANGE },
    { replace: true }
  );
  await toolkit.stateStorageContainer.set(
    APP_STATE_URL_KEY,
    { query: { esql: 'from auditbeat-* | where ecs.version == "8.0.0"' }, columns: ['stale'] },
    { replace: true }
  );

  return { ...toolkit, services, tabId, stateContainer };
};

describe('applyTimelineStateToDiscover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes the restored time range to the URL, where tab initialization reads it', async () => {
    const { stateContainer, stateStorageContainer } = await setup();

    await applyTimelineStateToDiscover({
      stateContainer,
      appState: restoredAppState,
      timeRange: RESTORED_TIME_RANGE,
    });

    expect(stateStorageContainer.get(GLOBAL_STATE_URL_KEY)).toEqual(
      expect.objectContaining({ time: RESTORED_TIME_RANGE })
    );
  });

  it('replaces app state left in the URL by the previously opened timeline', async () => {
    const { stateContainer, stateStorageContainer } = await setup();

    await applyTimelineStateToDiscover({
      stateContainer,
      appState: restoredAppState,
      timeRange: RESTORED_TIME_RANGE,
    });

    expect(stateStorageContainer.get(APP_STATE_URL_KEY)).toEqual(
      expect.objectContaining({ columns: ['event.category', 'ecs.version'] })
    );
  });

  // The regression this whole file exists for: the range was applied to Redux only, so
  // `initializeSingleTab` — which runs straight after the customization callbacks and prefers the
  // range already in the URL — put the previous timeline's range back. In the browser that
  // surfaced as an ES|QL query returning no rows, and the test that caught it did so by timing
  // out waiting for a column header.
  it('survives Discover tab initialization', async () => {
    const { stateContainer, services, tabId, initializeSingleTab } = await setup();

    await applyTimelineStateToDiscover({
      stateContainer,
      appState: restoredAppState,
      timeRange: RESTORED_TIME_RANGE,
    });

    await initializeSingleTab({ tabId, skipWaitForDataFetching: true });

    expect(services.timefilter.setTime).toHaveBeenCalledWith(RESTORED_TIME_RANGE);
    expect(services.timefilter.setTime).not.toHaveBeenCalledWith(PREVIOUS_TIMELINE_TIME_RANGE);
  });

  it('applies the default range for a timeline with no saved Discover session', async () => {
    const { stateContainer, services, tabId, initializeSingleTab } = await setup();

    await applyTimelineStateToDiscover({
      stateContainer,
      appState: { query: { esql: '' } },
      timeRange: PREVIOUS_TIMELINE_TIME_RANGE,
    });

    await initializeSingleTab({ tabId, skipWaitForDataFetching: true });

    expect(services.timefilter.setTime).toHaveBeenCalledWith(PREVIOUS_TIMELINE_TIME_RANGE);
  });
});

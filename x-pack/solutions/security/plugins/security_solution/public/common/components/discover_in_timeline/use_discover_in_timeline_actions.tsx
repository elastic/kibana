/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtendedDiscoverStateContainer } from '@kbn/discover-plugin/public';
import { APP_STATE_URL_KEY, GLOBAL_STATE_URL_KEY } from '@kbn/discover-plugin/common';
import type { SaveSavedSearchOptions } from '@kbn/saved-search-plugin/public';
import type { History } from 'history';
import { isEqualWith } from 'lodash';
import qs from 'query-string';
import { useMemo, useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import { useDispatch, useStore } from 'react-redux';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import type { DiscoverAppState } from '@kbn/discover-plugin/public/application/main/state_management/redux';
import type { TimeRange } from '@kbn/es-query';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useDiscoverState } from '../../../timelines/components/timeline/tabs/esql/use_discover_state';
import { timelineDefaults } from '../../../timelines/store/defaults';
import { TimelineId } from '../../../../common/types';
import { timelineActions, timelineSelectors } from '../../../timelines/store';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { useShallowEqualSelector } from '../../hooks/use_selector';
import { useKibana } from '../../lib/kibana';
import type { State } from '../../store';
import { savedSearchComparator } from '../../../timelines/components/timeline/tabs/esql/utils';
import { encodeQueryString } from '../../utils/global_query_string/helpers';
import {
  DISCOVER_SEARCH_SAVE_ERROR_TITLE,
  DISCOVER_SEARCH_SAVE_ERROR_UNKNOWN,
} from './translations';

function defaultDiscoverAppState(): DiscoverAppState {
  return {
    query: {
      esql: '',
    },
    sort: [['@timestamp', 'desc']],
    columns: [],
    interval: 'auto',
    filters: [],
    hideChart: true,
    grid: {},
  };
}

export const defaultDiscoverTimeRange: TimeRange = {
  from: 'now-15m',
  to: 'now',
  mode: 'relative',
};

/**
 * How the timeline awaiting its ES|QL tab restore was restored. `opened` replaced the timeline on
 * screen, so the Discover state in the URL is the previous timeline's. `fromUrl` is the timeline
 * the URL points at (a page load or a history navigation), so the Discover state in the URL is its
 * own, unsaved work included.
 */
export type TimelineRestore = 'opened' | 'fromUrl';

export const useDiscoverInTimelineActions = (
  discoverStateContainer: RefObject<ExtendedDiscoverStateContainer | undefined>,
  history?: History
) => {
  const { setDiscoverAppState } = useDiscoverState();
  const { addError } = useAppToasts();

  const {
    services: { customDataService: discoverDataService, savedSearch: savedSearchService },
  } = useKibana();

  const dispatch = useDispatch();
  const store = useStore<State>();

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const timeline = useShallowEqualSelector(
    (state) => getTimeline(state, TimelineId.active) ?? timelineDefaults
  );

  /**
   * Reads the timeline currently occupying the active slot straight from the store, rather than
   * from the render-time copy, so callers can compare it across an await without depending on
   * React having re-rendered in the meantime.
   */
  const getActiveSavedObjectId = useCallback(
    () => getTimeline(store.getState(), TimelineId.active)?.savedObjectId ?? null,
    [getTimeline, store]
  );
  const { savedSearchId, version } = timeline;

  // We're using a ref here to prevent a cyclic hook-dependency chain of updateSavedSearch
  const timelineRef = useRef(timeline);
  timelineRef.current = timeline;

  // Set while a restored timeline's state has not reached a Discover state container, because the
  // ES|QL tab was not mounted or unmounted mid-restore. The tab reads it on mount to tell a
  // restore apart from a plain remount of the timeline already on screen, where the in-session
  // state has to survive.
  const timelineRestorePending = useRef<TimelineRestore | null>(null);
  // Identifies the latest restore. Each one awaits the saved search and Discover, so an older one
  // can resume after a newer one took over the marker and the container.
  const latestRestoreRequest = useRef(0);

  const queryClient = useQueryClient();

  const { mutateAsync: saveSavedSearch, status: saveSavedSearchStatus } = useMutation({
    mutationFn: ({
      savedSearch,
      savedSearchOptions,
    }: {
      savedSearch: SavedSearch;
      savedSearchOptions: SaveSavedSearchOptions;
    }) => savedSearchService.save(savedSearch, savedSearchOptions),
    onSuccess: (data) => {
      // Invalidate and refetch
      if (data) {
        dispatch(
          timelineActions.endTimelineSaving({
            id: TimelineId.active,
          })
        );
      }
      queryClient.invalidateQueries({ queryKey: ['savedSearchById', savedSearchId] });
    },
    mutationKey: [version],
  });

  /*
   * generates Appstate from a given saved Search object
   *
   * @param savedSearch
   *
   * */
  const getAppStateFromSavedSearch = useCallback(
    (savedSearch: SavedSearch) => {
      const appState = discoverStateContainer.current?.getAppStateFromSavedSearch(savedSearch);
      return {
        savedSearch,
        appState,
      };
    },
    [discoverStateContainer]
  );

  /*
   * Removes the Discover app and global state from the URL. The ES|QL tab only writes it while it
   * is mounted, so it belongs to the timeline that was on screen at the time.
   */
  const dropDiscoverUrlState = useCallback(() => {
    if (!history) return;
    const urlParams = qs.parse(history.location.search, { sort: false });
    if (!(APP_STATE_URL_KEY in urlParams) && !(GLOBAL_STATE_URL_KEY in urlParams)) return;

    delete urlParams[APP_STATE_URL_KEY];
    delete urlParams[GLOBAL_STATE_URL_KEY];
    history.replace({ search: encodeQueryString(urlParams), state: history.location.state });
  }, [history]);

  /*
   * resets discover state to a default value
   *
   * */
  const resetDiscoverAppState = useCallback(
    async (
      newSavedSearchId?: string | null,
      { isRestoringFromUrl = false }: { isRestoringFromUrl?: boolean } = {}
    ) => {
      const restoreRequest = ++latestRestoreRequest.current;
      const isSuperseded = () => latestRestoreRequest.current !== restoreRequest;

      // The ES|QL tab publishes its state container while it is mounted and releases it when it
      // is not. Opening a timeline switches it to the Query tab, which can release the container
      // while the saved search below is being fetched, so the restore stays pending until the
      // state has reached a container and the tab otherwise applies it on its next mount.
      timelineRestorePending.current = isRestoringFromUrl ? 'fromUrl' : 'opened';

      // An opened timeline takes over the active slot, and the timeline URL param, in the history
      // entry that is current now. The Discover state in that entry is the previous timeline's,
      // and a reload or a Back to the entry would restore it as this timeline's own. Dropping it
      // here, before any await, keeps every entry's Discover state with the timeline it names.
      // Discover's URL sync ignores the removal and only writes on its own state changes.
      if (!isRestoringFromUrl) dropDiscoverUrlState();

      if (newSavedSearchId) {
        // Applying the default state below would empty the redux copy of the Discover state and
        // move the timefilter to `now-15m`, even though the caller asked for a session to be
        // restored. Leave both alone and let the tab restore itself when it mounts.
        const containerAtStart = discoverStateContainer.current;
        if (!containerAtStart) return;

        let savedSearch;
        try {
          savedSearch = await savedSearchService.get(newSavedSearchId);
          if (isSuperseded()) return;
          const savedSearchState = savedSearch ? getAppStateFromSavedSearch(savedSearch) : null;
          const currentContainer = discoverStateContainer.current;

          if (
            !currentContainer?.internalState?.dispatch ||
            !currentContainer?.injectCurrentTab ||
            !currentContainer?.internalActions
          ) {
            return;
          }

          const discoverDispatch = currentContainer.internalState.dispatch;
          const injectCurrentTab = currentContainer.injectCurrentTab;
          const internalActions = currentContainer.internalActions;

          try {
            discoverDispatch(injectCurrentTab(internalActions.stopSyncing)());
            discoverDispatch(injectCurrentTab(internalActions.initializeAndSync)());
          } catch {
            // The tab has no data state container until Discover has finished mounting, and
            // re-establishing the sync throws until then. Keep going: the state below is what
            // the timeline is being restored to, and dropping it leaves the previously opened
            // timeline's Discover session on screen.
          }

          await discoverDispatch(
            injectCurrentTab(internalActions.updateAppStateAndReplaceUrl)({
              appState: savedSearchState?.appState ?? {},
            })
          );
          if (isSuperseded()) return;
          setDiscoverAppState(savedSearchState?.appState ?? defaultDiscoverAppState());
          const timeRange = savedSearch.timeRange ?? defaultDiscoverTimeRange;
          discoverDispatch(
            injectCurrentTab(internalActions.updateGlobalState)({
              globalState: {
                timeRange,
              },
            })
          );
          // `updateGlobalState` only writes Discover's own copy of the range, which is what the
          // date picker renders. The ES|QL search reads the range from the timefilter service
          // instead, so without this the picker shows the restored range while every query keeps
          // running against this service's default one.
          discoverDataService.query.timefilter.timefilter.setTime(timeRange);
          timelineRestorePending.current = null;
        } catch (e) {
          if (isSuperseded()) return;
          // With the same tab still mounted, nothing is left for its next mount to restore: a
          // marker left behind would make a plain Query to ES|QL switch replace the in-session
          // state. A tab that mounted during the fetch reads the marker itself.
          if (discoverStateContainer.current === containerAtStart) {
            timelineRestorePending.current = null;
          }
        }
      } else {
        const defaultState = defaultDiscoverAppState();
        discoverStateContainer.current?.internalState.dispatch(
          discoverStateContainer.current.injectCurrentTab(
            discoverStateContainer.current.internalActions.resetAppState
          )({
            appState: defaultState,
          })
        );
        await discoverStateContainer.current?.internalState.dispatch(
          discoverStateContainer.current?.injectCurrentTab(
            discoverStateContainer.current?.internalActions.updateAppStateAndReplaceUrl
          )({
            appState: {},
          })
        );
        if (isSuperseded()) return;
        setDiscoverAppState(defaultState);
        const discoverState = discoverStateContainer.current;
        discoverState?.internalState.dispatch(
          discoverState.injectCurrentTab(discoverState.internalActions.updateGlobalState)({
            globalState: {
              timeRange: defaultDiscoverTimeRange,
            },
          })
        );
        discoverDataService.query.timefilter.timefilter.setTime(defaultDiscoverTimeRange);
        if (discoverState) {
          timelineRestorePending.current = null;
        }
      }
    },
    [
      discoverStateContainer,
      getAppStateFromSavedSearch,
      savedSearchService,
      setDiscoverAppState,
      discoverDataService,
      dropDiscoverUrlState,
    ]
  );

  const persistSavedSearch = useCallback(
    async (savedSearch: SavedSearch, savedSearchOption: SaveSavedSearchOptions) => {
      if (!discoverStateContainer) {
        // eslint-disable-next-line no-console
        console.log(`Saved search is not open since state container is null`);
        return;
      }
      if (!savedSearch) return;

      function onError(error: Error) {
        addError(error, { title: DISCOVER_SEARCH_SAVE_ERROR_TITLE });
      }
      try {
        const id = await saveSavedSearch({
          savedSearch,
          savedSearchOptions: savedSearchOption,
        });
        if (id) {
          return { id };
        } else {
          addError(DISCOVER_SEARCH_SAVE_ERROR_UNKNOWN, { title: DISCOVER_SEARCH_SAVE_ERROR_TITLE });
        }
      } catch (err) {
        onError(err);
      }
    },
    [addError, discoverStateContainer, saveSavedSearch]
  );

  /*
   * persists the given savedSearch
   *
   * */
  const updateSavedSearch = useCallback(
    async (savedSearch: SavedSearch, timelineId: string, onUpdate?: () => void) => {
      savedSearch.timeRestore = true;
      savedSearch.timeRange =
        savedSearch.timeRange ?? discoverDataService.query.timefilter.timefilter.getTime();
      savedSearch.tags = ['security-solution-default'];

      // If there is already a saved search, only update the local state
      if (savedSearchId) {
        savedSearch.id = savedSearchId;
        if (!timelineRef.current.savedSearch) {
          dispatch(
            timelineActions.initializeSavedSearch({
              id: TimelineId.active,
              savedSearch,
            })
          );
        } else if (
          !isEqualWith(timelineRef.current.savedSearch, savedSearch, savedSearchComparator)
        ) {
          dispatch(
            timelineActions.updateSavedSearch({
              id: TimelineId.active,
              savedSearch,
            })
          );
        }
      } else {
        // If no saved search exists. Create a new saved search instance and associate it with the timeline.
        try {
          // Make sure we're not creating a saved search while a previous creation call is in progress
          if (saveSavedSearchStatus === 'loading') {
            return;
          }
          dispatch(
            timelineActions.startTimelineSaving({
              id: TimelineId.active,
            })
          );
          // `TimelineId.active` is a slot, not an identity: creating a new timeline replaces
          // whatever occupies it. Remember which timeline this Discover session belongs to so
          // the dispatches below can be skipped if the slot moved on while the save was in
          // flight — otherwise they hand the session to the timeline that took its place.
          const savedObjectIdBeingSaved = getActiveSavedObjectId();
          const response = await persistSavedSearch(savedSearch, {
            copyOnSave: !savedSearchId,
          });

          const responseIsEmpty = !response || !response?.id;
          if (responseIsEmpty) {
            throw new Error('Response is empty');
          } else if (
            !savedSearchId &&
            !responseIsEmpty &&
            getActiveSavedObjectId() === savedObjectIdBeingSaved
          ) {
            dispatch(
              timelineActions.updateSavedSearchId({
                id: TimelineId.active,
                savedSearchId: response.id,
              })
            );
            // Seed the local saved search with the one that was just created. Without this the
            // redux copy stays null: the sync effect that would normally initialize it
            // short-circuits because the local and persisted states are already equal right
            // after creation. A null copy makes every later timeline save skip persisting the
            // Discover session, because `patchTimeline` is guarded on it.
            dispatch(
              timelineActions.initializeSavedSearch({
                id: TimelineId.active,
                savedSearch: { ...savedSearch, id: response.id },
              })
            );
            // Also save the timeline, this will only happen once, in case there is no saved search id yet
            dispatch(timelineActions.saveTimeline({ id: TimelineId.active, saveAsNew: false }));
            onUpdate?.();
          }
        } catch (err) {
          dispatch(
            timelineActions.endTimelineSaving({
              id: TimelineId.active,
            })
          );
        }
      }
    },
    [
      persistSavedSearch,
      savedSearchId,
      dispatch,
      discoverDataService,
      saveSavedSearchStatus,
      getActiveSavedObjectId,
    ]
  );

  const initializeLocalSavedSearch = useCallback(
    async (savedSearch: SavedSearch, timelineId: string) => {
      dispatch(
        timelineActions.initializeSavedSearch({
          id: TimelineId.active,
          savedSearch,
        })
      );
    },
    [dispatch]
  );

  const actions = useMemo(
    () => ({
      resetDiscoverAppState,
      updateSavedSearch,
      initializeLocalSavedSearch,
      getAppStateFromSavedSearch,
      defaultDiscoverAppState: defaultDiscoverAppState(),
      timelineRestorePending,
    }),
    [
      resetDiscoverAppState,
      updateSavedSearch,
      initializeLocalSavedSearch,
      getAppStateFromSavedSearch,
    ]
  );

  return actions;
};

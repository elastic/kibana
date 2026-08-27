/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux-v7';
import { TimelineId, TimelineTabs } from '../../../../common/types/timeline';
import { setActiveTabTimeline, showTimeline } from '../../../timelines/store/actions';
import { useDiscoverInTimelineContext } from '../../../common/components/discover_in_timeline/use_discover_in_timeline_context';
import { useDiscoverState } from '../../../timelines/components/timeline/tabs/esql/use_discover_state';
import { useKibana } from '../../../common/lib/kibana';

/** The RnA episodes view — the ES|QL source Timeline is pointed at. */
const EPISODES_VIEW = '$.alert-episodes';

/** Half-width of the time window centered on the episode's `@timestamp` (1 hour on each side). */
const TIME_BUFFER_MS = 60 * 60 * 1000;

export interface InvestigateEpisodeParams {
  /** The episode id, used to isolate the single row in the ES|QL query. */
  episodeId: string;
  /**
   * Episode start (`first_timestamp`) — the low end of the time window, so the window frames when
   * the alert actually fired (mirroring how v1 centers the timeline on the alert's trigger time).
   */
  startTimestamp?: string;
  /**
   * Episode's latest activity (`@timestamp` = `last_timestamp`) — the high end of the window. The
   * ES|QL tab returns the collapsed episode row whose `@timestamp` is this max, so the picker must
   * reach it or the row falls out of range. Optional — with neither bound the picker is left as-is.
   */
  endTimestamp?: string;
}

/**
 * ES|QL that isolates a single episode by id. `episode.id` is a dotted field name, so it must be
 * backtick-quoted in ES|QL.
 */
const buildEpisodeEsql = (episodeId: string): string =>
  `FROM ${EPISODES_VIEW} | WHERE \`episode.id\` == "${episodeId}"`;

/**
 * Returns a callback that opens the active Timeline directly into its ES|QL tab, scoped to a single
 * episode.
 *
 * Mirrors the assistant's "Send to timeline" ES|QL path: push `{ query: { esql } }` into the
 * embedded Discover state, then switch Timeline to the ES|QL tab and show it. Because that tab is
 * embedded Discover, it derives its own ad-hoc DataView from the `FROM` clause — so we can point it
 * at the `$.alert-episodes` ES|QL view with no DataView wiring of our own.
 *
 * Additionally, the ES|QL tab applies its time picker on top of the query, and that picker is backed
 * by the isolated `customDataService` timefilter (not the global one). So we widen it to a buffer
 * around the episode's `@timestamp` — the same idea as how v1 frames an alert's timeline around the
 * alert timestamp — to guarantee the row falls within range.
 *
 * Callers should gate on `useEsqlAvailability().isEsqlAdvancedSettingEnabled` — the ES|QL tab is
 * hidden when that advanced setting is off.
 */
export const useInvestigateEpisodeInTimeline = (): ((params: InvestigateEpisodeParams) => void) => {
  const dispatch = useDispatch();
  const {
    services: { customDataService },
  } = useKibana();
  const { discoverStateContainer, defaultDiscoverAppState } = useDiscoverInTimelineContext();
  const { setDiscoverAppState } = useDiscoverState();

  return useCallback(
    ({ episodeId, startTimestamp, endTimestamp }: InvestigateEpisodeParams) => {
      if (!episodeId) {
        return;
      }
      const esql = buildEpisodeEsql(episodeId);

      // Bracket the episode's activity span with a buffer on each side: low bound = trigger time
      // (first_timestamp), high bound = latest activity (@timestamp = last_timestamp). For a
      // single-event episode both collapse to the same point, i.e. ±buffer around it.
      const times = [startTimestamp, endTimestamp]
        .map((value) => (value ? new Date(value).getTime() : NaN))
        .filter((ms) => !Number.isNaN(ms));
      const timeRange =
        times.length === 0
          ? undefined
          : {
              from: new Date(Math.min(...times) - TIME_BUFFER_MS).toISOString(),
              to: new Date(Math.max(...times) + TIME_BUFFER_MS).toISOString(),
              mode: 'absolute' as const,
            };

      // Seed the security-side Discover app state so the next mount of the ES|QL tab picks up our
      // query (the tab reads this slice as its initial state). Also push to the live state container
      // when one is already mounted, so an open tab updates without waiting for a remount.
      setDiscoverAppState({ ...defaultDiscoverAppState, query: { esql } });
      const liveContainer = discoverStateContainer.current;
      if (liveContainer) {
        liveContainer.internalState.dispatch(
          liveContainer.injectCurrentTab(liveContainer.internalActions.setAppState)({
            appState: { query: { esql } },
          })
        );
        liveContainer.internalState.dispatch(
          liveContainer.injectCurrentTab(liveContainer.internalActions.updateAppStateAndReplaceUrl)({
            appState: { query: { esql } },
          })
        );
      }

      dispatch(setActiveTabTimeline({ id: TimelineId.active, activeTab: TimelineTabs.esql }));
      dispatch(showTimeline({ id: TimelineId.active, show: true }));

      // Time is the fiddly part. The ES|QL tab is embedded Discover, and when it (re)mounts after we
      // show it, Discover initializes its time to the default (`now-15m`), clobbering anything we set
      // beforehand — its mount callback only seeds time from a saved search, never from us. There is
      // no built-in hook to preset the time otherwise, so we re-apply the buffer across the next few
      // frames until it lands after the mount. The picker is the isolated `customDataService`
      // timefilter; we also set Discover's `globalState` on whatever container is current so both the
      // picker and the fetch use our window.
      if (timeRange) {
        const applyTime = () => {
          customDataService.query.timefilter.timefilter.setTime(timeRange);
          const current = discoverStateContainer.current;
          if (current) {
            current.internalState.dispatch(
              current.injectCurrentTab(current.internalActions.updateGlobalState)({
                globalState: { timeRange },
              })
            );
          }
        };
        applyTime();
        let remaining = 6;
        const intervalId = setInterval(() => {
          applyTime();
          remaining -= 1;
          if (remaining <= 0) {
            clearInterval(intervalId);
          }
        }, 120);
      }
    },
    [
      customDataService,
      discoverStateContainer,
      defaultDiscoverAppState,
      setDiscoverAppState,
      dispatch,
    ]
  );
};

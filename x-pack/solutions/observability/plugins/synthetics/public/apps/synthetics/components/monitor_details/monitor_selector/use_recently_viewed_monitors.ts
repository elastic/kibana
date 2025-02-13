/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';
import { fetchMonitorManagementList, getMonitorListPageStateWithDefaults } from '../../../state';

const HISTORY_LENGTH = 5;

interface RecentMonitorSelectableOption {
  key: string;
  monitorQueryId: string;
  label: string;
  locationIds: string[];
  isGroupLabel: boolean;
}

export const useRecentlyViewedMonitors = () => {
  const [recentlyViewedMonitorQueryIds, setRecentlyViewedMonitorQueryIds] = useLocalStorage<
    string[]
  >('xpack.synthetics.recentlyViewedMonitors', []);
  const fetchedMonitorsRef = useRef<RecentMonitorSelectableOption[]>([]);
  const monitorQueryId = useMonitorQueryId();

  const fetchedMonitorQueryIdsSnap = JSON.stringify(
    [...fetchedMonitorsRef.current.map(({ key }) => key)].sort()
  );

  const updateRecentlyViewed = useCallback(() => {
    const updatedIdsToPersist = fetchedMonitorsRef.current.length
      ? fetchedMonitorsRef.current.map(({ monitorQueryId: id }) => id)
      : recentlyViewedMonitorQueryIds ?? [];

    if (monitorQueryId) {
      setRecentlyViewedMonitorQueryIds(
        [monitorQueryId, ...updatedIdsToPersist]
          .filter((id, index, arr) => arr.indexOf(id) === index)
          .slice(0, HISTORY_LENGTH)
      );
    }
    // Exclude `recentlyViewedMonitorQueryIds`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRecentlyViewedMonitorQueryIds, monitorQueryId, fetchedMonitorQueryIdsSnap]);

  useEffect(() => {
    updateRecentlyViewed();
  }, [updateRecentlyViewed, monitorQueryId]);

  const { loading } = useFetcher(async () => {
    const monitorQueryIdsToFetch = (recentlyViewedMonitorQueryIds ?? []).filter(
      (id) => id !== monitorQueryId
    );
    if (
      monitorQueryId &&
      monitorQueryIdsToFetch.length &&
      JSON.stringify([...monitorQueryIdsToFetch].sort()) !== fetchedMonitorQueryIdsSnap
    ) {
      const fetchedResult = await fetchMonitorManagementList(
        getMonitorListPageStateWithDefaults({
          pageSize: HISTORY_LENGTH,
          monitorQueryIds: monitorQueryIdsToFetch,
        })
      );

      if (fetchedResult?.monitors?.length) {
        const persistedOrderHash = monitorQueryIdsToFetch.reduce(
          (acc, cur, index) => ({ ...acc, [cur]: index }),
          {} as Record<string, number>
        );

        // Reorder fetched monitors as per the persisted order
        const fetchedMonitorsInPersistedOrder = [...fetchedResult?.monitors].sort(
          (a, b) => persistedOrderHash[a.id] - persistedOrderHash[b.id]
        );
        fetchedMonitorsRef.current = fetchedMonitorsInPersistedOrder.map((mon) => {
          return {
            key: mon.id,
            monitorQueryId: mon.id,
            label: mon.name,
            locationIds: (mon.locations ?? []).map(({ id }) => id),
            isGroupLabel: false,
          };
        });

        updateRecentlyViewed();
      }
    }
    // FIXME: Dario thinks there is a better way to do this but
    // he's getting tired and maybe the Synthetics folks can fix it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitorQueryId]);

  return useMemo(
    () => ({
      loading,
      recentMonitorOptions: fetchedMonitorsRef.current.length
        ? [
            { key: 'recently_viewed', label: RECENTLY_VIEWED, isGroupLabel: true },
            ...fetchedMonitorsRef.current,
          ]
        : [],
    }),
    // Make it also depend on `fetchedMonitorQueryIdsSnap`
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, fetchedMonitorQueryIdsSnap]
  );
};

const RECENTLY_VIEWED = i18n.translate('xpack.synthetics.monitorSummary.recentlyViewed', {
  defaultMessage: 'Recently viewed',
});

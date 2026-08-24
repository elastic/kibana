/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSyntheticsEsSearch } from './use_synthetics_es_search';
import { MONITOR_STATUS_ENUM } from '../../../../common/constants/monitor_management';
import { useMonitorHealthColor } from '../components/monitors_page/hooks/use_monitor_health_color';
import { UNNAMED_LOCATION } from '../../../../common/constants';
import { getSyntheticsCcsIndex } from '../../../../common/get_synthetics_indices';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  FINAL_SUMMARY_FILTER,
  STATUS_LOOKBACK_RANGE_FILTER,
} from '../../../../common/constants/client_defaults';
import {
  HEARTBEAT_UNMAPPED_LOCATION_LABEL,
  type EncryptedSyntheticsSavedMonitor,
  type MonitorOrigin,
  type Ping,
} from '../../../../common/runtime_types';
import { getMonitorIdentityFilter, isUnmappedHeartbeatLocation } from '../../../../common/lib';
import { useSyntheticsRefreshContext } from '../contexts';
import { useGetUrlParams } from './use_url_params';
import { useLocations } from './use_locations';

export type LocationsStatus = Array<{ status: string; id: string; label: string; color: string }>;

export function useStatusByLocation({
  configId,
  monitorLocations,
  origin,
}: {
  configId: string;
  monitorLocations?: EncryptedSyntheticsSavedMonitor['locations'];
  origin?: MonitorOrigin;
}) {
  const { lastRefresh } = useSyntheticsRefreshContext();
  const { remoteName } = useGetUrlParams();

  const { locations: allLocations } = useLocations();

  const isHeartbeat = origin === 'heartbeat' && !remoteName;

  const { data, loading } = useSyntheticsEsSearch(
    {
      index: getSyntheticsCcsIndex(remoteName),
      size: 0,
      query: {
        bool: {
          filter: [
            FINAL_SUMMARY_FILTER,
            EXCLUDE_RUN_ONCE_FILTER,
            STATUS_LOOKBACK_RANGE_FILTER,
            getMonitorIdentityFilter({ monitorId: configId, origin, remoteName }),
          ],
        },
      },
      sort: [{ '@timestamp': 'desc' }],
      aggs: {
        locations: {
          terms: {
            field: 'observer.geo.name',
            missing: isHeartbeat ? HEARTBEAT_UNMAPPED_LOCATION_LABEL : UNNAMED_LOCATION,
            size: 1000,
          },
          aggs: {
            summary: {
              top_hits: {
                size: 1,
              },
            },
          },
        },
      },
    },
    [lastRefresh, configId, remoteName, origin],
    { name: 'getMonitorStatusByLocation' }
  );

  const getColor = useMonitorHealthColor();

  return useMemo(() => {
    const locationPings = (data?.aggregations?.locations.buckets ?? []).map((loc) => {
      return {
        key: String(loc.key),
        ping: loc.summary.hits.hits?.[0]._source as Ping,
      };
    });
    const locations = (monitorLocations ?? []).map((loc) => {
      // Prefer the local service-locations registry (so private/managed
      // locations render with their full metadata) but fall back to the
      // monitor's own location entry for ids unknown locally — this is the
      // case for remote monitors whose location ids live only on the source
      // cluster's Kibana.
      const fullLoc = allLocations.find((l) => l.id === loc.id) ?? loc;
      const match = locationPings.find(
        ({ key, ping }) =>
          key === fullLoc.label ||
          ping.observer?.geo?.name === fullLoc.label ||
          (isUnmappedHeartbeatLocation(fullLoc.label) && isUnmappedHeartbeatLocation(key))
      );
      const ping = match?.ping;
      const status = ping
        ? (ping.summary?.down ?? 0) > 0
          ? MONITOR_STATUS_ENUM.DOWN
          : MONITOR_STATUS_ENUM.UP
        : MONITOR_STATUS_ENUM.PENDING;
      return {
        status,
        id: fullLoc.id,
        label: fullLoc.label,
        color: getColor(status),
      };
    });

    return {
      locations,
      loading,
    };
  }, [data?.aggregations?.locations.buckets, monitorLocations, loading, allLocations, getColor]);
}

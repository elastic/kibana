/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { useEsSearch } from '@kbn/observability-shared-plugin/public';
import { useMemo } from 'react';
import { SYNTHETICS_INDEX_PATTERN, UNNAMED_LOCATION } from '../../../../common/constants';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  FINAL_SUMMARY_FILTER,
} from '../../../../common/constants/client_defaults';
import { EncryptedSyntheticsSavedMonitor, Ping } from '../../../../common/runtime_types';
import { useSyntheticsRefreshContext } from '../contexts';
import { useLocations } from './use_locations';

export type LocationsStatus = Array<{ status: string; id: string; label: string; color: string }>;

export function useStatusByLocation({
  configId,
  monitorLocations,
}: {
  configId: string;
  monitorLocations?: EncryptedSyntheticsSavedMonitor['locations'];
}) {
  const { euiTheme } = useEuiTheme();

  const { lastRefresh } = useSyntheticsRefreshContext();

  const { locations: allLocations } = useLocations();

  const { data, loading } = useEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN,
      size: 0,
      query: {
        bool: {
          filter: [
            FINAL_SUMMARY_FILTER,
            EXCLUDE_RUN_ONCE_FILTER,
            {
              term: {
                config_id: configId,
              },
            },
          ],
        },
      },
      sort: [{ '@timestamp': 'desc' }],
      aggs: {
        locations: {
          terms: {
            field: 'observer.geo.name',
            missing: UNNAMED_LOCATION,
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
    [lastRefresh, configId],
    { name: 'getMonitorStatusByLocation' }
  );

  return useMemo(() => {
    const getColor = (status: string) => {
      const isAmsterdam = euiTheme.themeName === 'EUI_THEME_AMSTERDAM';

      switch (status) {
        case 'up':
          return isAmsterdam ? euiTheme.colors.vis.euiColorVis0 : euiTheme.colors.success;
        case 'down':
          return isAmsterdam ? euiTheme.colors.vis.euiColorVis9 : euiTheme.colors.vis.euiColorVis6;
        default:
          return euiTheme.colors.backgroundBaseSubdued;
      }
    };

    const locationPings = (data?.aggregations?.locations.buckets ?? []).map((loc) => {
      return loc.summary.hits.hits?.[0]._source as Ping;
    });
    const locations = (monitorLocations ?? [])
      .map((loc) => {
        const fullLoc = allLocations.find((l) => l.id === loc.id);
        if (fullLoc) {
          const ping = locationPings.find((p) => p.observer?.geo?.name === fullLoc?.label);
          const status = ping ? (ping.summary?.down ?? 0 > 0 ? 'down' : 'up') : 'unknown';
          return {
            status,
            id: fullLoc?.id,
            label: fullLoc?.label,
            color: getColor(status),
          };
        }
      })
      .filter(Boolean) as LocationsStatus;

    return {
      locations,
      loading,
    };
  }, [
    allLocations,
    data?.aggregations?.locations.buckets,
    loading,
    monitorLocations,
    euiTheme.themeName,
    euiTheme.colors.success,
    euiTheme.colors.vis.euiColorVis0,
    euiTheme.colors.vis.euiColorVis6,
    euiTheme.colors.vis.euiColorVis9,
    euiTheme.colors.backgroundBaseSubdued,
  ]);
}

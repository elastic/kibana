/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { useSyntheticsEsSearch } from './use_synthetics_es_search';
import { getSyntheticsCcsIndex } from '../../../../common/get_synthetics_indices';
import { getHeartbeatLocationFilter } from '../../../../common/lib';
import { STATUS_LOOKBACK_RANGE_FILTER } from '../../../../common/constants/client_defaults';
import type { MonitorOrigin, Ping } from '../../../../common/runtime_types';

export const useMonitorDetail = (
  configId: string,
  location: string,
  remoteName?: string,
  origin?: MonitorOrigin
): { data?: Ping; loading?: boolean } => {
  const index = getSyntheticsCcsIndex(remoteName);

  // Heartbeat / Agent autodiscovery pings carry no `config_id`; their identity
  // is `monitor.id` (see `useExternalMonitor`). Matching `config_id` would
  // return zero hits and the flyout would render "waiting for first run".
  const isHeartbeat = origin === 'heartbeat' && !remoteName;
  const identityFilter = isHeartbeat
    ? { term: { 'monitor.id': configId } }
    : { term: { config_id: configId } };

  const params = {
    index,
    size: 1,
    query: {
      bool: {
        filter: [
          STATUS_LOOKBACK_RANGE_FILTER,
          identityFilter,
          ...getHeartbeatLocationFilter({ field: 'observer.geo.name', value: location }),
          {
            exists: {
              field: 'summary',
            },
          },
        ],
      },
    },
    sort: [{ '@timestamp': 'desc' as const }],
  };
  const { data: result, loading } = useSyntheticsEsSearch<
    Ping & { '@timestamp': string },
    SearchRequest
  >(params, [configId, location, remoteName, origin], {
    name: 'getMonitorStatusByLocation',
  });

  if (!result || result.hits.hits.length !== 1) return { data: undefined, loading };
  return {
    data: result.hits.hits[0]._source,
    loading,
  };
};

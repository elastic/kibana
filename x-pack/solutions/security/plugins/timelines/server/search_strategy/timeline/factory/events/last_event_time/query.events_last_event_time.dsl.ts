/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import type { TimelineEventsLastEventTimeRequestOptions } from '../../../../../../common/api/search_strategy/timeline/timeline';
import { LastEventIndexKey } from '../../../../../../common/api/search_strategy/timeline/timeline';

import { assertUnreachable } from '../../../../../../common/utility_types';

interface EventIndices {
  [key: string]: string[];
}

export const buildLastEventTimeQuery = ({
  indexKey,
  details,
  defaultIndex,
}: TimelineEventsLastEventTimeRequestOptions) => {
  const indicesToQuery: EventIndices = {
    hosts: defaultIndex || [],
    network: defaultIndex || [],
  };
  /**
   * Builds host filters from entityIdentifiers following EUID priority
   */
  const buildHostFilters = (
    entityIdentifiers: Record<string, string>
  ): Array<{ term: Record<string, string> }> | null => {
    const filters: Array<{ term: Record<string, string> }> = [];

    // Priority: host.entity.id > host.id > host.name > host.hostname
    if (entityIdentifiers['host.entity.id']) {
      filters.push({ term: { 'host.entity.id': entityIdentifiers['host.entity.id'] } });
      return filters;
    }
    if (entityIdentifiers['host.id']) {
      filters.push({ term: { 'host.id': entityIdentifiers['host.id'] } });
      return filters;
    }
    if (entityIdentifiers['host.name']) {
      filters.push({ term: { 'host.name': entityIdentifiers['host.name'] } });
      if (entityIdentifiers['host.domain']) {
        filters.push({ term: { 'host.domain': entityIdentifiers['host.domain'] } });
      }
      if (entityIdentifiers['host.mac']) {
        filters.push({ term: { 'host.mac': entityIdentifiers['host.mac'] } });
      }
      return filters;
    }
    if (entityIdentifiers['host.hostname']) {
      filters.push({ term: { 'host.hostname': entityIdentifiers['host.hostname'] } });
      if (entityIdentifiers['host.domain']) {
        filters.push({ term: { 'host.domain': entityIdentifiers['host.domain'] } });
      }
      if (entityIdentifiers['host.mac']) {
        filters.push({ term: { 'host.mac': entityIdentifiers['host.mac'] } });
      }
      return filters;
    }

    return null;
  };

  /**
   * Builds user filters from entityIdentifiers following EUID priority
   */
  const buildUserFilters = (
    entityIdentifiers: Record<string, string>
  ): Array<{ term: Record<string, string> }> | null => {
    const filters: Array<{ term: Record<string, string> }> = [];

    // Priority: user.entity.id > user.id > user.email > user.name
    if (entityIdentifiers['user.entity.id']) {
      filters.push({ term: { 'user.entity.id': entityIdentifiers['user.entity.id'] } });
      return filters;
    }
    if (entityIdentifiers['user.id']) {
      filters.push({ term: { 'user.id': entityIdentifiers['user.id'] } });
      return filters;
    }
    if (entityIdentifiers['user.email']) {
      filters.push({ term: { 'user.email': entityIdentifiers['user.email'] } });
      return filters;
    }
    if (entityIdentifiers['user.name']) {
      filters.push({ term: { 'user.name': entityIdentifiers['user.name'] } });
      if (entityIdentifiers['user.domain']) {
        filters.push({ term: { 'user.domain': entityIdentifiers['user.domain'] } });
      }
      if (entityIdentifiers['host.id']) {
        filters.push({ term: { 'host.id': entityIdentifiers['host.id'] } });
      }
      if (entityIdentifiers['host.domain']) {
        filters.push({ term: { 'host.domain': entityIdentifiers['host.domain'] } });
      }
      if (entityIdentifiers['host.name']) {
        filters.push({ term: { 'host.name': entityIdentifiers['host.name'] } });
      }
      if (entityIdentifiers['host.hostname']) {
        filters.push({ term: { 'host.hostname': entityIdentifiers['host.hostname'] } });
      }
      return filters;
    }

    return null;
  };

  /**
   * Builds filters from entityIdentifiers following EUID priority
   */
  const buildFiltersFromEntityIdentifiers = (
    entityIdentifiers?: Record<string, string>
  ): Array<{ term: Record<string, string> }> => {
    if (!entityIdentifiers) {
      return [];
    }

    const hostFilters = buildHostFilters(entityIdentifiers);
    if (hostFilters) {
      return hostFilters;
    }

    const userFilters = buildUserFilters(entityIdentifiers);
    if (userFilters) {
      return userFilters;
    }

    return [];
  };

  const getIpDetailsFilter = (ip: string) => [
    { term: { 'source.ip': ip } },
    { term: { 'destination.ip': ip } },
  ];
  const getQuery = (eventIndexKey: LastEventIndexKey) => {
    switch (eventIndexKey) {
      case LastEventIndexKey.ipDetails:
        if (details.ip) {
          return {
            allow_no_indices: true,
            index: indicesToQuery.network,
            ignore_unavailable: true,
            track_total_hits: false,
            query: { bool: { filter: { bool: { should: getIpDetailsFilter(details.ip) } } } },
            _source: false,
            fields: [
              {
                field: '@timestamp',
                format: 'strict_date_optional_time',
              },
            ],
            size: 1,
            sort: [
              {
                '@timestamp': {
                  order: 'desc',
                },
              },
            ],
          };
        }
        throw new Error('buildLastEventTimeQuery - no IP argument provided');
      case LastEventIndexKey.hostDetails:
        if (details.entityIdentifiers) {
          const filters = buildFiltersFromEntityIdentifiers(details.entityIdentifiers);
          if (filters.length > 0) {
            return {
              allow_no_indices: true,
              index: indicesToQuery.hosts,
              ignore_unavailable: true,
              track_total_hits: false,
              query: { bool: { filter: filters } },
              _source: false,
              fields: [
                {
                  field: '@timestamp',
                  format: 'strict_date_optional_time',
                },
              ],
              size: 1,
              sort: [
                {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
              ],
            };
          }
        }
      case LastEventIndexKey.userDetails:
        if (details.entityIdentifiers) {
          const filters = buildFiltersFromEntityIdentifiers(details.entityIdentifiers);
          if (filters.length > 0) {
            return {
              allow_no_indices: true,
              index: indicesToQuery.hosts,
              ignore_unavailable: true,
              track_total_hits: false,
              query: { bool: { filter: filters } },
              _source: false,
              fields: [
                {
                  field: '@timestamp',
                  format: 'strict_date_optional_time',
                },
              ],
              size: 1,
              sort: [
                {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
              ],
            };
          }
        }
      case LastEventIndexKey.hosts:
      case LastEventIndexKey.network:
      case LastEventIndexKey.users:
        return {
          allow_no_indices: true,
          index: indicesToQuery[indexKey],
          ignore_unavailable: true,
          track_total_hits: false,
          query: { match_all: {} },
          _source: false,
          fields: [
            {
              field: '@timestamp',
              format: 'strict_date_optional_time',
            },
          ],
          size: 1,
          sort: [
            {
              '@timestamp': {
                order: 'desc',
              },
            },
          ],
        };
      default:
        return assertUnreachable(eventIndexKey);
    }
  };
  // TODO: Yes, TypeScript defeated me. Need to remove this type
  // cast, typing issue seemed to have slipped into codebase previously
  return getQuery(indexKey) as ISearchRequestParams;
};

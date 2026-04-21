/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import { cloudFieldsMap, hostFieldsMap } from '@kbn/securitysolution-ecs';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import { isEmpty } from 'lodash';
import type { HostDetailsRequestOptions } from '../../../../../../common/search_strategy/security_solution';
import { createQueryFilterClauses, reduceFields } from '../../../../../utils/build_query';
import { HOST_DETAILS_FIELDS, buildFieldsTermAggregation } from './helpers';

const EUID_RUNTIME_FIELD = 'entity_id';

export const buildHostDetailsQuery = ({
  defaultIndex,
  hostName,
  timerange: { from, to },
  filterQuery,
  entityStoreV2,
}: HostDetailsRequestOptions): ISearchRequestParams => {
  const esFields = reduceFields(HOST_DETAILS_FIELDS, {
    ...hostFieldsMap,
    ...cloudFieldsMap,
  });

  // When no filter query is defined, we default to using the host name
  const hostNameFilter = isEmpty(filterQuery) ? { term: { 'host.name': hostName } } : undefined;

  const filter = [
    ...(entityStoreV2 ? [euid.dsl.getEuidDocumentsContainsIdFilter('host')] : []),
    ...(hostNameFilter ? [hostNameFilter] : []),
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        '@timestamp': {
          format: 'strict_date_optional_time',
          gte: from,
          lte: to,
        },
      },
    },
  ];

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    track_total_hits: false,
    ...(entityStoreV2
      ? { runtime_mappings: { [EUID_RUNTIME_FIELD]: euid.painless.getEuidRuntimeMapping('host') } }
      : {}),
    aggregations: {
      ...buildFieldsTermAggregation(esFields.filter((field) => !['@timestamp'].includes(field))),
      endpoint_id: {
        filter: {
          term: {
            'agent.type': 'endpoint',
          },
        },
        aggs: {
          value: {
            terms: {
              field: 'agent.id',
            },
          },
        },
      },
    },
    query: { bool: { filter } },
    _source: false,
    fields: [
      ...esFields,
      'agent.type',
      'agent.id',
      {
        field: '@timestamp',
        format: 'strict_date_optional_time',
      },
    ],
    size: 0,
  };

  return dslQuery;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SyntheticsRestApiRouteFactory } from '../types';
import { monitorAttributes, syntheticsMonitorType } from '../../../common/types/saved_objects';
import {
  ConfigKey,
  MonitorFiltersResult,
  EncryptedSyntheticsMonitorAttributes,
} from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { QuerySchema, getMonitorFilters, SEARCH_FIELDS } from '../common';
import { getAllLocations } from '../../synthetics_service/get_all_locations';

type Buckets = Array<{
  key: string;
  doc_count: number;
}>;

interface AggsResponse {
  locationsAggs: {
    buckets: Buckets;
  };
  tagsAggs: {
    buckets: Buckets;
  };
  projectsAggs: {
    buckets: Buckets;
  };
  monitorTypesAggs: {
    buckets: Buckets;
  };
  monitorIdsAggs: {
    buckets: Array<{
      key: string;
      doc_count: number;
      name: {
        hits: {
          hits: Array<{
            _source: {
              [syntheticsMonitorType]: {
                [ConfigKey.NAME]: string;
              };
            };
          }>;
        };
      };
    }>;
  };
}

export const getSyntheticsSuggestionsRoute: SyntheticsRestApiRouteFactory<
  MonitorFiltersResult
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SUGGESTIONS,
  validate: {
    query: QuerySchema,
  },
  handler: async (route): Promise<any> => {
    const {
      server: { logger },
      monitorConfigRepository,
    } = route;
    const { query } = route.request.query;

    const { filtersStr } = await getMonitorFilters(route);
    const { allLocations = [] } = await getAllLocations(route);
    try {
      const data = await monitorConfigRepository.find<EncryptedSyntheticsMonitorAttributes>({
        perPage: 0,
        filter: filtersStr ? `${filtersStr}` : undefined,
        aggs,
        search: query ? `${query}*` : undefined,
        searchFields: SEARCH_FIELDS,
      });

      const { monitorTypesAggs, tagsAggs, locationsAggs, projectsAggs, monitorIdsAggs } =
        (data?.aggregations as AggsResponse) ?? {};
      const allLocationsMap = new Map(allLocations.map((obj) => [obj.id, obj.label]));

      return {
        monitorIds: monitorIdsAggs?.buckets?.map(({ key, doc_count: count, name }) => ({
          label: name?.hits?.hits[0]?._source?.[syntheticsMonitorType]?.[ConfigKey.NAME] || key,
          value: key,
          count,
        })),
        tags:
          tagsAggs?.buckets?.map(({ key, doc_count: count }) => ({
            label: key,
            value: key,
            count,
          })) ?? [],
        locations:
          locationsAggs?.buckets?.map(({ key, doc_count: count }) => ({
            label: allLocationsMap.get(key) || key,
            value: key,
            count,
          })) ?? [],
        projects:
          projectsAggs?.buckets?.map(({ key, doc_count: count }) => ({
            label: key,
            value: key,
            count,
          })) ?? [],
        monitorTypes:
          monitorTypesAggs?.buckets?.map(({ key, doc_count: count }) => ({
            label: key,
            value: key,
            count,
          })) ?? [],
      };
    } catch (error) {
      logger.error(`Failed to fetch synthetics suggestions: ${error}`);
    }
  },
});

const aggs = {
  tagsAggs: {
    terms: {
      field: `${monitorAttributes}.${ConfigKey.TAGS}`,
      size: 10000,
      exclude: [''],
    },
  },
  monitorTypeAggs: {
    terms: {
      field: `${monitorAttributes}.${ConfigKey.MONITOR_TYPE}.keyword`,
      size: 10000,
      exclude: [''],
    },
  },
  locationsAggs: {
    terms: {
      field: `${monitorAttributes}.${ConfigKey.LOCATIONS}.id`,
      size: 10000,
      exclude: [''],
    },
  },
  projectsAggs: {
    terms: {
      field: `${monitorAttributes}.${ConfigKey.PROJECT_ID}`,
      size: 10000,
      exclude: [''],
    },
  },
  monitorTypesAggs: {
    terms: {
      field: `${monitorAttributes}.${ConfigKey.MONITOR_TYPE}.keyword`,
      size: 10000,
      exclude: [''],
    },
  },
  monitorIdsAggs: {
    terms: {
      field: `${monitorAttributes}.${ConfigKey.MONITOR_QUERY_ID}`,
      size: 10000,
      exclude: [''],
    },
    aggs: {
      name: {
        top_hits: {
          _source: [`${syntheticsMonitorType}.${ConfigKey.NAME}`],
          size: 1,
        },
      },
    },
  },
};

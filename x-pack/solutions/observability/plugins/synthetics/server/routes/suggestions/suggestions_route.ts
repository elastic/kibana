/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  syntheticsMonitorAttributes,
  syntheticsMonitorSavedObjectType,
  legacySyntheticsMonitorTypeSingle,
  legacyMonitorAttributes,
} from '../../../common/types/saved_objects';
import { SyntheticsRestApiRouteFactory } from '../types';
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

type MonitorTypes =
  | typeof syntheticsMonitorSavedObjectType
  | typeof legacySyntheticsMonitorTypeSingle;

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
              [key in MonitorTypes]: {
                [ConfigKey.NAME]: string;
              };
            };
          }>;
        };
      };
    }>;
  };
}

// Helper to sum buckets by key
function sumBuckets(bucketsA: Buckets = [], bucketsB: Buckets = []): Buckets {
  const map = new Map<string, number>();
  for (const { key, doc_count: docCount } of bucketsA) {
    map.set(key, docCount);
  }
  for (const { key, doc_count: docCount } of bucketsB) {
    map.set(key, (map.get(key) || 0) + docCount);
  }
  return Array.from(map.entries()).map(([key, docCount]) => ({ key, doc_count: docCount }));
}

// Helper to sum monitorIdsAggs buckets
function sumMonitorIdsBuckets(
  bucketsA: AggsResponse['monitorIdsAggs']['buckets'] = [],
  bucketsB: AggsResponse['monitorIdsAggs']['buckets'] = []
): AggsResponse['monitorIdsAggs']['buckets'] {
  const map = new Map<string, { doc_count: number; name?: any }>();
  for (const b of bucketsA) {
    map.set(b.key, { doc_count: b.doc_count, name: b.name });
  }
  for (const b of bucketsB) {
    if (map.has(b.key)) {
      map.get(b.key)!.doc_count += b.doc_count;
    } else {
      map.set(b.key, { doc_count: b.doc_count, name: b.name });
    }
  }
  return Array.from(map.entries()).map(([key, { doc_count: docCount, name }]) => ({
    key,
    doc_count: docCount,
    name,
  }));
}

// Helper to generate aggs for new or legacy monitors
function getAggs(isLegacy: boolean) {
  const attributes = isLegacy ? legacyMonitorAttributes : syntheticsMonitorAttributes;
  const savedObjectType = isLegacy
    ? legacySyntheticsMonitorTypeSingle
    : syntheticsMonitorSavedObjectType;
  return {
    tagsAggs: {
      terms: {
        field: `${attributes}.${ConfigKey.TAGS}`,
        size: 10000,
        exclude: [''],
      },
    },
    monitorTypeAggs: {
      terms: {
        field: `${attributes}.${ConfigKey.MONITOR_TYPE}.keyword`,
        size: 10000,
        exclude: [''],
      },
    },
    locationsAggs: {
      terms: {
        field: `${attributes}.${ConfigKey.LOCATIONS}.id`,
        size: 10000,
        exclude: [''],
      },
    },
    projectsAggs: {
      terms: {
        field: `${attributes}.${ConfigKey.PROJECT_ID}`,
        size: 10000,
        exclude: [''],
      },
    },
    monitorTypesAggs: {
      terms: {
        field: `${attributes}.${ConfigKey.MONITOR_TYPE}.keyword`,
        size: 10000,
        exclude: [''],
      },
    },
    monitorIdsAggs: {
      terms: {
        field: `${attributes}.${ConfigKey.MONITOR_QUERY_ID}`,
        size: 10000,
        exclude: [''],
      },
      aggs: {
        name: {
          top_hits: {
            _source: [`${savedObjectType}.${ConfigKey.NAME}`],
            size: 1,
          },
        },
      },
    },
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
    const { savedObjectsClient } = route;
    const { query } = route.request.query;

    const { filtersStr } = await getMonitorFilters(route, syntheticsMonitorAttributes);
    const { allLocations = [] } = await getAllLocations(route);

    // Find for new monitors
    const data = await savedObjectsClient.find<EncryptedSyntheticsMonitorAttributes>({
      type: syntheticsMonitorSavedObjectType,
      perPage: 0,
      filter: filtersStr ? filtersStr : undefined,
      aggs: getAggs(false),
      search: query ? `${query}*` : undefined,
      searchFields: SEARCH_FIELDS,
    });

    const { filtersStr: legacyFilterStr } = await getMonitorFilters(route, legacyMonitorAttributes);

    // Find for legacy monitors
    const legacyData = await savedObjectsClient.find<any>({
      type: legacySyntheticsMonitorTypeSingle,
      perPage: 0,
      filter: legacyFilterStr ? legacyFilterStr : undefined,
      aggs: getAggs(true),
      search: query ? `${query}*` : undefined,
      searchFields: SEARCH_FIELDS,
    });

    // Extract aggs
    const { monitorTypesAggs, tagsAggs, locationsAggs, projectsAggs, monitorIdsAggs } =
      (data?.aggregations as AggsResponse) ?? {};

    const {
      monitorTypesAggs: legacyMonitorTypesAggs,
      tagsAggs: legacyTagsAggs,
      locationsAggs: legacyLocationsAggs,
      projectsAggs: legacyProjectsAggs,
      monitorIdsAggs: legacyMonitorIdsAggs,
    } = (legacyData?.aggregations as AggsResponse) ?? {};

    const allLocationsMap = new Map(allLocations.map((obj) => [obj.id, obj.label]));

    // Sum buckets
    const summedTags = sumBuckets(tagsAggs?.buckets, legacyTagsAggs?.buckets);
    const summedLocations = sumBuckets(locationsAggs?.buckets, legacyLocationsAggs?.buckets);
    const summedProjects = sumBuckets(projectsAggs?.buckets, legacyProjectsAggs?.buckets);
    const summedMonitorTypes = sumBuckets(
      monitorTypesAggs?.buckets,
      legacyMonitorTypesAggs?.buckets
    );
    const summedMonitorIds = sumMonitorIdsBuckets(
      monitorIdsAggs?.buckets,
      legacyMonitorIdsAggs?.buckets
    );

    return {
      monitorIds: summedMonitorIds?.map(({ key, doc_count: count, name }) => {
        const source = name?.hits?.hits[0]?._source || {};
        return {
          label:
            source?.[syntheticsMonitorSavedObjectType]?.[ConfigKey.NAME] ||
            source?.[legacySyntheticsMonitorTypeSingle]?.[ConfigKey.NAME] ||
            key,
          value: key,
          count,
        };
      }),
      tags:
        summedTags?.map(({ key, doc_count: count }) => ({
          label: key,
          value: key,
          count,
        })) ?? [],
      locations:
        summedLocations?.map(({ key, doc_count: count }) => ({
          label: allLocationsMap.get(key) || key,
          value: key,
          count,
        })) ?? [],
      projects:
        summedProjects?.map(({ key, doc_count: count }) => ({
          label: key,
          value: key,
          count,
        })) ?? [],
      monitorTypes:
        summedMonitorTypes?.map(({ key, doc_count: count }) => ({
          label: key,
          value: key,
          count,
        })) ?? [],
    };
  },
});

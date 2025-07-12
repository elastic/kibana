/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SyntheticsRestApiRouteFactory } from '../types';
import {
  legacySyntheticsMonitorTypeSingle,
  syntheticsMonitorAttributes,
  syntheticsMonitorSavedObjectType,
  legacyMonitorAttributes,
} from '../../../common/types/saved_objects';
import { ConfigKey, MonitorFiltersResult } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

type Buckets = Array<{
  key: string;
  doc_count: number;
}>;

interface AggsResponse {
  monitorTypes: {
    buckets: Buckets;
  };
  locations: {
    buckets: Buckets;
  };
  tags: {
    buckets: Buckets;
  };
  projects: {
    buckets: Buckets;
  };
  schedules: {
    buckets: Buckets;
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

// Helper to generate aggs for new or legacy monitors
function getAggs(isLegacy: boolean) {
  const attributes = isLegacy ? legacyMonitorAttributes : syntheticsMonitorAttributes;
  return {
    monitorTypes: {
      terms: {
        field: `${attributes}.${ConfigKey.MONITOR_TYPE}.keyword`,
        size: 10000,
      },
    },
    tags: {
      terms: {
        field: `${attributes}.${ConfigKey.TAGS}`,
        size: 10000,
      },
    },
    locations: {
      terms: {
        field: `${attributes}.${ConfigKey.LOCATIONS}.id`,
        size: 10000,
      },
    },
    projects: {
      terms: {
        field: `${attributes}.${ConfigKey.PROJECT_ID}`,
        size: 10000,
      },
    },
    schedules: {
      terms: {
        field: `${attributes}.${ConfigKey.SCHEDULE}.number`,
        size: 10000,
      },
    },
  };
}

export const getSyntheticsFilters: SyntheticsRestApiRouteFactory<MonitorFiltersResult> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.FILTERS,
  validate: {
    query: schema.object({
      showFromAllSpaces: schema.maybe(schema.boolean()),
    }),
  },
  handler: async ({ savedObjectsClient, request }): Promise<any> => {
    const showFromAllSpaces = request.query?.showFromAllSpaces;

    // Find for new monitors
    const data = await savedObjectsClient.find({
      type: syntheticsMonitorSavedObjectType,
      perPage: 0,
      aggs: getAggs(false),
      ...(showFromAllSpaces ? { namespaces: ['*'] } : {}),
    });

    // Find for legacy monitors
    const legacyData = await savedObjectsClient.find({
      type: legacySyntheticsMonitorTypeSingle,
      perPage: 0,
      aggs: getAggs(true),
      ...(showFromAllSpaces ? { namespaces: ['*'] } : {}),
    });

    // Extract aggs
    const { monitorTypes, tags, locations, projects, schedules } =
      (data?.aggregations as AggsResponse) ?? {};
    const {
      monitorTypes: legacyMonitorTypes,
      tags: legacyTags,
      locations: legacyLocations,
      projects: legacyProjects,
      schedules: legacySchedules,
    } = (legacyData?.aggregations as AggsResponse) ?? {};

    // Sum buckets
    const summedMonitorTypes = sumBuckets(monitorTypes?.buckets, legacyMonitorTypes?.buckets);
    const summedTags = sumBuckets(tags?.buckets, legacyTags?.buckets);
    const summedLocations = sumBuckets(locations?.buckets, legacyLocations?.buckets);
    const summedProjects = sumBuckets(projects?.buckets, legacyProjects?.buckets);
    const summedSchedules = sumBuckets(schedules?.buckets, legacySchedules?.buckets);

    return {
      monitorTypes:
        summedMonitorTypes?.map(({ key, doc_count: count }) => ({
          label: key,
          count,
        })) ?? [],
      tags:
        summedTags?.map(({ key, doc_count: count }) => ({
          label: key,
          count,
        })) ?? [],
      locations:
        summedLocations?.map(({ key, doc_count: count }) => ({
          label: key,
          count,
        })) ?? [],
      projects:
        summedProjects
          ?.filter(({ key }) => key)
          .map(({ key, doc_count: count }) => ({
            label: key,
            count,
          })) ?? [],
      schedules:
        summedSchedules?.map(({ key, doc_count: count }) => ({
          label: String(key),
          count,
        })) ?? [],
    };
  },
});

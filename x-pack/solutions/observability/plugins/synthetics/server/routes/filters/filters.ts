/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { queryBoolean } from '../zod_query';
import type { SyntheticsRestApiRouteFactory } from '../types';
import {
  legacySyntheticsMonitorTypeSingle,
  syntheticsMonitorAttributes,
  syntheticsMonitorSavedObjectType,
  legacyMonitorAttributes,
} from '../../../common/types/saved_objects';
import type { MonitorFiltersResult } from '../../../common/runtime_types';
import { ConfigKey } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { scheduleBucketLabel } from '../common';

type Buckets = Array<{
  key: string;
  doc_count: number;
}>;

type ScheduleBuckets = Array<{
  key: Array<string | number>;
  doc_count: number;
}>;

interface AggsResponse {
  monitorTypes?: { buckets: Buckets };
  monitorTypesLegacy?: { buckets: Buckets };
  locations?: { buckets: Buckets };
  locationsLegacy?: { buckets: Buckets };
  tags?: { buckets: Buckets };
  tagsLegacy?: { buckets: Buckets };
  projects?: { buckets: Buckets };
  projectsLegacy?: { buckets: Buckets };
  schedules?: { buckets: ScheduleBuckets };
  schedulesLegacy?: { buckets: ScheduleBuckets };
}

const mergeBuckets = (...bucketSets: Array<Buckets | undefined>) => {
  const map = new Map<string, number>();
  for (const buckets of bucketSets) {
    buckets?.forEach(({ key, doc_count: docCount }) => {
      const k = String(key);
      map.set(k, (map.get(k) ?? 0) + docCount);
    });
  }
  return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
};

const toScheduleBuckets = (buckets?: ScheduleBuckets): Buckets | undefined =>
  buckets?.map(({ key, doc_count: docCount }) => ({
    key: scheduleBucketLabel(key),
    doc_count: docCount,
  }));

export const getSyntheticsFilters: SyntheticsRestApiRouteFactory<MonitorFiltersResult> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.FILTERS,
  validate: {
    query: z.strictObject({
      showFromAllSpaces: queryBoolean.optional(),
    }),
  },
  handler: async ({ savedObjectsClient, request }): Promise<any> => {
    const showFromAllSpaces = request.query?.showFromAllSpaces;
    const data = await savedObjectsClient.find({
      type: [legacySyntheticsMonitorTypeSingle, syntheticsMonitorSavedObjectType],
      perPage: 0,
      aggs,
      ...(showFromAllSpaces ? { namespaces: ['*'] } : {}),
    });

    const {
      monitorTypes,
      monitorTypesLegacy,
      tags,
      tagsLegacy,
      locations,
      locationsLegacy,
      projects,
      projectsLegacy,
      schedules,
      schedulesLegacy,
    } = (data?.aggregations as AggsResponse) ?? {};

    return {
      monitorTypes: mergeBuckets(monitorTypes?.buckets, monitorTypesLegacy?.buckets),
      tags: mergeBuckets(tags?.buckets, tagsLegacy?.buckets),
      locations: mergeBuckets(locations?.buckets, locationsLegacy?.buckets),
      projects: mergeBuckets(projects?.buckets, projectsLegacy?.buckets).filter(
        ({ label }) => label
      ),
      schedules: mergeBuckets(
        toScheduleBuckets(schedules?.buckets),
        toScheduleBuckets(schedulesLegacy?.buckets)
      ),
    };
  },
});

const aggs = {
  monitorTypes: {
    terms: {
      field: `${syntheticsMonitorAttributes}.${ConfigKey.MONITOR_TYPE}.keyword`,
      size: 10000,
    },
  },
  monitorTypesLegacy: {
    terms: {
      field: `${legacyMonitorAttributes}.${ConfigKey.MONITOR_TYPE}.keyword`,
      size: 10000,
    },
  },
  tags: {
    terms: {
      field: `${syntheticsMonitorAttributes}.${ConfigKey.TAGS}`,
      size: 10000,
    },
  },
  tagsLegacy: {
    terms: {
      field: `${legacyMonitorAttributes}.${ConfigKey.TAGS}`,
      size: 10000,
    },
  },
  locations: {
    terms: {
      field: `${syntheticsMonitorAttributes}.${ConfigKey.LOCATIONS}.id`,
      size: 10000,
    },
  },
  locationsLegacy: {
    terms: {
      field: `${legacyMonitorAttributes}.${ConfigKey.LOCATIONS}.id`,
      size: 10000,
    },
  },
  projects: {
    terms: {
      field: `${syntheticsMonitorAttributes}.${ConfigKey.PROJECT_ID}`,
      size: 10000,
    },
  },
  projectsLegacy: {
    terms: {
      field: `${legacyMonitorAttributes}.${ConfigKey.PROJECT_ID}`,
      size: 10000,
    },
  },
  schedules: {
    multi_terms: {
      size: 10000,
      terms: [
        { field: `${syntheticsMonitorAttributes}.${ConfigKey.SCHEDULE}.number` },
        { field: `${syntheticsMonitorAttributes}.${ConfigKey.SCHEDULE}.unit` },
      ],
    },
  },
  schedulesLegacy: {
    multi_terms: {
      size: 10000,
      terms: [
        { field: `${legacyMonitorAttributes}.${ConfigKey.SCHEDULE}.number` },
        { field: `${legacyMonitorAttributes}.${ConfigKey.SCHEDULE}.unit` },
      ],
    },
  },
};

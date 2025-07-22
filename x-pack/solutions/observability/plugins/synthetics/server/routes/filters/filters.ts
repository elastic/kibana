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
    const data = await savedObjectsClient.find({
      type: [legacySyntheticsMonitorTypeSingle, syntheticsMonitorSavedObjectType],
      perPage: 0,
      aggs,
      ...(showFromAllSpaces ? { namespaces: ['*'] } : {}),
    });

    const { monitorTypes, tags, locations, projects, schedules } =
      (data?.aggregations as AggsResponse) ?? {};
    return {
      monitorTypes:
        monitorTypes?.buckets?.map(({ key, doc_count: count }) => ({
          label: key,
          count,
        })) ?? [],
      tags:
        tags?.buckets?.map(({ key, doc_count: count }) => ({
          label: key,
          count,
        })) ?? [],
      locations:
        locations?.buckets?.map(({ key, doc_count: count }) => ({
          label: key,
          count,
        })) ?? [],
      projects:
        projects?.buckets
          ?.filter(({ key }) => key)
          .map(({ key, doc_count: count }) => ({
            label: key,
            count,
          })) ?? [],
      schedules:
        schedules?.buckets?.map(({ key, doc_count: count }) => ({
          label: String(key),
          count,
        })) ?? [],
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
  tags: {
    terms: {
      field: `${syntheticsMonitorAttributes}.${ConfigKey.TAGS}`,
      size: 10000,
    },
  },
  locations: {
    terms: {
      field: `${syntheticsMonitorAttributes}.${ConfigKey.LOCATIONS}.id`,
      size: 10000,
    },
  },
  projects: {
    terms: {
      field: `${syntheticsMonitorAttributes}.${ConfigKey.PROJECT_ID}`,
      size: 10000,
    },
  },
  schedules: {
    terms: {
      field: `${syntheticsMonitorAttributes}.${ConfigKey.SCHEDULE}.number`,
      size: 10000,
    },
  },
};

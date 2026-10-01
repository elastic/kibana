/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';
import type { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { MonitorTypeEnum } from '../../../../common/runtime_types';
import {
  legacyMonitorAttributes,
  syntheticsMonitorAttributes,
  syntheticsMonitorSOTypes,
} from '../../../../common/types/saved_objects';

type Payload = Array<{
  id: string;
  count: number;
  browserCount: number;
}>;

interface Bucket {
  key: string;
  doc_count: number;
}

const locationTerms = (attributes: string) => ({
  terms: {
    field: `${attributes}.locations.id`,
    size: 20000,
  },
});

const browserLocationAgg = (attributes: string) => ({
  filter: { term: { [`${attributes}.type`]: MonitorTypeEnum.BROWSER } },
  aggs: { locations: locationTerms(attributes) },
});

const aggs = {
  locations_legacy: locationTerms(legacyMonitorAttributes),
  locations: locationTerms(syntheticsMonitorAttributes),
  browser_locations_legacy: browserLocationAgg(legacyMonitorAttributes),
  browser_locations: browserLocationAgg(syntheticsMonitorAttributes),
};

export const getLocationMonitors: SyntheticsRestApiRouteFactory<Payload> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS_MONITORS,

  validate: {},
  handler: async ({ server, savedObjectsClient, syntheticsMonitorClient }) => {
    const soClient = server.coreStart.savedObjects.createInternalRepository();
    const { locations } = await getPrivateLocationsAndAgentPolicies(
      savedObjectsClient,
      syntheticsMonitorClient
    );

    const locationMonitors = await soClient.find({
      type: syntheticsMonitorSOTypes,
      perPage: 0,
      aggs,
      namespaces: [ALL_SPACES_ID],
    });

    const aggsResp = locationMonitors.aggregations as
      | {
          locations_legacy?: { buckets: Bucket[] };
          locations?: { buckets: Bucket[] };
          browser_locations_legacy?: { locations?: { buckets: Bucket[] } };
          browser_locations?: { locations?: { buckets: Bucket[] } };
        }
      | undefined;

    // Merge counts from both buckets
    const counts: Record<string, number> = {};
    const browserCounts: Record<string, number> = {};

    const addCounts = (buckets: Bucket[] | undefined, target: Record<string, number>) => {
      buckets?.forEach(({ key, doc_count: docCount }) => {
        target[key] = (target[key] || 0) + docCount;
      });
    };

    addCounts(aggsResp?.locations_legacy?.buckets, counts);
    addCounts(aggsResp?.locations?.buckets, counts);
    addCounts(aggsResp?.browser_locations_legacy?.locations?.buckets, browserCounts);
    addCounts(aggsResp?.browser_locations?.locations?.buckets, browserCounts);

    return Object.entries(counts)
      .map(([id, count]) => ({
        id,
        count,
        browserCount: browserCounts[id] ?? 0,
      }))
      .filter(({ id }) =>
        locations.some((location) => location.id === id || location.label === id)
      );
  },
});

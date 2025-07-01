/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';
import { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import {
  legacyMonitorAttributes,
  syntheticsMonitorAttributes,
  syntheticsMonitorSOTypes,
} from '../../../../common/types/saved_objects';

type Payload = Array<{
  id: string;
  count: number;
}>;

interface Bucket {
  key: string;
  doc_count: number;
}

const aggs = {
  locations_legacy: {
    terms: {
      field: `${legacyMonitorAttributes}.locations.id`,
      size: 20000,
    },
  },
  locations: {
    terms: {
      field: `${syntheticsMonitorAttributes}.locations.id`,
      size: 20000,
    },
  },
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
        }
      | undefined;

    // Merge counts from both buckets
    const counts: Record<string, number> = {};

    aggsResp?.locations_legacy?.buckets.forEach(({ key, doc_count: docCount }) => {
      counts[key] = (counts[key] || 0) + docCount;
    });
    aggsResp?.locations?.buckets.forEach(({ key, doc_count: docCount }) => {
      counts[key] = (counts[key] || 0) + docCount;
    });

    return Object.entries(counts)
      .map(([id, count]) => ({
        id,
        count,
      }))
      .filter(({ id }) =>
        locations.some((location) => location.id === id || location.label === id)
      );
  },
});

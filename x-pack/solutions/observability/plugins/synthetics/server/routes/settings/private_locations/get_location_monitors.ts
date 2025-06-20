/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { getSavedObjectKqlFilter } from '../../common';
import { RouteContext, SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import {
  legacyMonitorAttributes,
  syntheticsMonitorSOTypes,
} from '../../../../common/types/saved_objects';

type Payload = Array<{
  id: string;
  count: number;
}>;

interface ExpectedResponse {
  locations: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

const aggs = {
  locations: {
    terms: {
      field: `${legacyMonitorAttributes}.locations.id`,
      size: 10000,
    },
  },
};

export const getLocationMonitors: SyntheticsRestApiRouteFactory<Payload> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS_MONITORS,

  validate: {},
  handler: async (context) => {
    return await getMonitorsByLocation(context);
  },
});

export const getMonitorsByLocation = async (context: RouteContext, locationId?: string) => {
  const { monitorConfigRepository } = context;
  const soClient = context.server.coreStart.savedObjects.createInternalRepository();
  const locationFilter = getSavedObjectKqlFilter({ field: 'locations.id', values: locationId });

  const locationMonitors = await monitorConfigRepository.find(
    {
      perPage: 0,
      aggs,
      filter: locationFilter,
      namespaces: [ALL_SPACES_ID],
    },
    syntheticsMonitorSOTypes,
    soClient
  );

  return (
    (locationMonitors.aggregations as ExpectedResponse)?.locations.buckets.map(
      ({ key: id, doc_count: count }) => ({
        id,
        count,
      })
    ) ?? []
  );
};

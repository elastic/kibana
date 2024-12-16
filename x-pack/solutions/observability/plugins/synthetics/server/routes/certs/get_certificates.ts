/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SyntheticsRestApiRouteFactory } from '../types';
import {
  getAllMonitors,
  processMonitors,
} from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { monitorAttributes } from '../../../common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { CertResult, GetCertsParams } from '../../../common/runtime_types';
import { ConfigKey } from '../../../common/constants/monitor_management';
import { getSyntheticsCerts } from '../../queries/get_certs';

export const getSyntheticsCertsRoute: SyntheticsRestApiRouteFactory<
  { data: CertResult },
  GetCertsParams
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.CERTS,
  validate: {
    query: schema.object({
      pageIndex: schema.maybe(schema.number()),
      size: schema.maybe(schema.number()),
      sortBy: schema.maybe(schema.string()),
      direction: schema.maybe(schema.string()),
      search: schema.maybe(schema.string()),
      from: schema.maybe(schema.string()),
      to: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ request, syntheticsEsClient, savedObjectsClient }) => {
    const queryParams = request.query;

    const monitors = await getAllMonitors({
      soClient: savedObjectsClient,
      filter: `${monitorAttributes}.${ConfigKey.ENABLED}: true`,
    });

    if (monitors.length === 0) {
      return {
        data: {
          certs: [],
          total: 0,
        },
      };
    }

    const { enabledMonitorQueryIds } = processMonitors(monitors);

    const data = await getSyntheticsCerts({
      ...queryParams,
      syntheticsEsClient,
      monitorIds: enabledMonitorQueryIds,
    });
    return { data };
  },
});

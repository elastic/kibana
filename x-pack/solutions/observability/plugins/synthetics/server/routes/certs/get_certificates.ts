/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { syntheticsMonitorAttributes } from '../../../common/types/saved_objects';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { processMonitors } from '../../saved_objects/synthetics_monitor/process_monitors';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import type { CertResult, GetCertsParams } from '../../../common/runtime_types';
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
      sortBy: schema.maybe(schema.string({ maxLength: 256 })),
      direction: schema.maybe(schema.string({ maxLength: 256 })),
      search: schema.maybe(schema.string({ maxLength: 1024 })),
      from: schema.maybe(schema.string({ maxLength: 256 })),
      to: schema.maybe(schema.string({ maxLength: 256 })),
      // Upper bound on certificate `not_after` (datemath, e.g. `now+30d`), powering
      // the "Expiring within" quick filter. Already-expired certs are included.
      notValidAfter: schema.maybe(schema.string({ maxLength: 256 })),
      // Comma-separated filters (e.g. `http,browser`) sent as strings to avoid
      // query-array serialization edge cases. `monitorTypes` scopes by monitor
      // type; `browserResourceTypes` and `party` are browser-only quick filters;
      // `tags` scopes by monitor tag.
      monitorTypes: schema.maybe(schema.string({ maxLength: 1024 })),
      browserResourceTypes: schema.maybe(schema.string({ maxLength: 1024 })),
      party: schema.maybe(schema.string({ maxLength: 256 })),
      tags: schema.maybe(schema.string({ maxLength: 1024 })),
      // Comma-separated issuer (certificate authority) common names; scopes the
      // list to certs signed by the selected CA(s).
      issuers: schema.maybe(schema.string({ maxLength: 4096 })),
    }),
  },
  handler: async ({ request, syntheticsEsClient, monitorConfigRepository }) => {
    const { monitorTypes, browserResourceTypes, party, tags, issuers, ...queryParams } =
      request.query;

    const toList = (value?: string) =>
      value ? value.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

    const monitors = await monitorConfigRepository.getAll({
      filter: `${syntheticsMonitorAttributes}.${ConfigKey.ENABLED}: true`,
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
      monitorTypes: toList(monitorTypes),
      browserResourceTypes: toList(browserResourceTypes),
      party: toList(party),
      tags: toList(tags),
      issuers: toList(issuers),
      syntheticsEsClient,
      monitorIds: enabledMonitorQueryIds,
      // The certificates page lists certs from every enabled monitor, including
      // the certificate captured on a browser monitor's navigation request.
      includeBrowserCerts: true,
    });
    return { data };
  },
});

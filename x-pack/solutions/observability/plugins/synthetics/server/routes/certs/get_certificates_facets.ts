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
import type { CertFacets } from '../../../common/runtime_types';
import { ConfigKey } from '../../../common/constants/monitor_management';
import { getSyntheticsCertsFacets } from '../../queries/get_certs_facets';
import { isCCSEnabled } from '../../lib/remote_result_utils';

// Maximum number of remote cluster aliases allowed per request. Each alias
// generates a wildcard clause in Elasticsearch, so an unbounded list can
// produce slow queries or exceed query-clause limits.
const MAX_REMOTE_NAMES = 50;

const EMPTY_FACETS: CertFacets = {
  monitorTypes: [],
  tags: [],
  issuers: [],
  resourceTypes: [],
  party: [],
  expiringWithin: [],
};

// Returns global distinct-cert counts per quick-filter value so the certificates page
// can show counts next to each filter option, independent of the active selection.
export const getSyntheticsCertsFacetsRoute: SyntheticsRestApiRouteFactory<{
  data: CertFacets;
}> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.CERTS_FACETS,
  validate: {
    query: schema.object({
      from: schema.maybe(schema.string({ maxLength: 256 })),
      to: schema.maybe(schema.string({ maxLength: 256 })),
      remoteNames: schema.maybe(schema.string({ maxLength: 1024 })),
    }),
  },
  handler: async ({
    request,
    response,
    syntheticsEsClient,
    monitorConfigRepository,
    server,
    spaceId,
  }) => {
    const { from, to, remoteNames } = request.query;

    const ccsEnabled = isCCSEnabled(server);
    const rawRemoteNames = remoteNames ? remoteNames.split(',').filter(Boolean) : undefined;
    if (rawRemoteNames && rawRemoteNames.length > MAX_REMOTE_NAMES) {
      return response.badRequest({
        body: { message: `remoteNames must not exceed ${MAX_REMOTE_NAMES} entries` },
      });
    }
    const remoteNameList = rawRemoteNames ? [...new Set(rawRemoteNames)] : undefined;

    const monitors = await monitorConfigRepository.getAll({
      filter: `${syntheticsMonitorAttributes}.${ConfigKey.ENABLED}: true`,
    });

    // Same rationale as the cert list route: without CCS, no local monitors
    // means no certs to facet over. With CCS on, remote-only monitors may
    // still contribute counts so the search must run.
    if (!ccsEnabled && monitors.length === 0) {
      return { data: EMPTY_FACETS };
    }

    const { enabledMonitorQueryIds } = processMonitors(monitors);

    const data = await getSyntheticsCertsFacets({
      from,
      to,
      syntheticsEsClient,
      monitorIds: enabledMonitorQueryIds,
      ccsEnabled,
      remoteNames: remoteNameList,
      spaceId,
    });

    return { data };
  },
});

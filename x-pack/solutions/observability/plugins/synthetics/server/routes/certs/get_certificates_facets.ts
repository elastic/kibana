/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { MAX_DATE_RANGE_LENGTH, MAX_ROUTE_STRING_LENGTH, queryBoolean } from '../zod_query';
import { syntheticsMonitorAttributes } from '../../../common/types/saved_objects';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { processMonitors } from '../../saved_objects/synthetics_monitor/process_monitors';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import type { CertFacets } from '../../../common/runtime_types';
import { ConfigKey } from '../../../common/constants/monitor_management';
import { getSyntheticsCertsFacets } from '../../queries/get_certs_facets';
import { isCCSEnabled } from '../../lib/remote_result_utils';
import { parseRemoteNames } from '../../lib/parse_remote_names';

const EMPTY_FACETS: CertFacets = {
  monitorTypes: [],
  tags: [],
  issuers: [],
  resourceTypes: [],
  certOrigin: [],
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
    query: z.strictObject({
      from: z.string().max(MAX_DATE_RANGE_LENGTH).optional(),
      to: z.string().max(MAX_DATE_RANGE_LENGTH).optional(),
      remoteNames: z.string().max(MAX_ROUTE_STRING_LENGTH).optional(),
      showFromAllSpaces: queryBoolean.optional(),
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
    const { from, to, remoteNames, showFromAllSpaces } = request.query;

    const ccsEnabled = isCCSEnabled(server);

    const remoteNamesResult = parseRemoteNames(remoteNames);
    if (!remoteNamesResult.ok) {
      return response.badRequest({
        body: {
          message: `remoteNames must not exceed ${remoteNamesResult.max} entries (received ${remoteNamesResult.received})`,
        },
      });
    }
    const remoteNameList = remoteNamesResult.value;

    const monitors = await monitorConfigRepository.getAll({
      filter: `${syntheticsMonitorAttributes}.${ConfigKey.ENABLED}: true`,
      showFromAllSpaces,
    });

    // See `get_certificates.ts` for the CCS short-circuit rationale.
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
      showFromAllSpaces: Boolean(showFromAllSpaces),
    });

    return { data };
  },
});

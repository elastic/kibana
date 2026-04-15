/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as rt from 'io-ts';
import { createRouteValidationFunction, jsonRt } from '@kbn/io-ts-utils';
import type { LogQueryFields } from '@kbn/metrics-data-access-plugin/server';
import { SNAPSHOT_API_MAX_METRICS } from '../../../common/constants';
import type { InfraBackendLibs } from '../../lib/infra_types';
import { UsageCollector } from '../../usage/usage_collector';
import { SnapshotRequestRT, SnapshotNodeResponseRT } from '../../../common/http_api/snapshot_api';
import { createSearchClient } from '../../lib/create_search_client';
import { withInspect } from '../../lib/helpers/with_inspect';
import { getNodes } from './lib/get_nodes';

const InspectQueryRT = rt.exact(rt.partial({ _inspect: jsonRt.pipe(rt.boolean) }));

export const initSnapshotRoute = (libs: InfraBackendLibs) => {
  const validateBody = createRouteValidationFunction(SnapshotRequestRT);

  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/snapshot',
      validate: {
        body: validateBody,
        query: createRouteValidationFunction(InspectQueryRT),
      },
    },
    withInspect(async (requestContext, request) => {
      const snapshotRequest = request.body;

      if (snapshotRequest.metrics.length > SNAPSHOT_API_MAX_METRICS) {
        throw Boom.badRequest(
          `'metrics' size is greater than maximum of ${SNAPSHOT_API_MAX_METRICS} allowed.`
        );
      }

      const soClient = (await requestContext.core).savedObjects.client;
      const source = await libs.sources.getSourceConfiguration(soClient, snapshotRequest.sourceId);
      const compositeSize = libs.configuration.inventory.compositeSize;
      const [, { logsShared }] = await libs.getStartServices();
      const logQueryFields: LogQueryFields | undefined = await logsShared.logViews
        .getScopedClient(request)
        .getResolvedLogView({
          type: 'log-view-reference',
          logViewId: snapshotRequest.sourceId,
        })
        .then(
          ({ indices }) => ({ indexPattern: indices }),
          () => undefined
        );

      UsageCollector.countNode(snapshotRequest.nodeType);
      const client = createSearchClient(requestContext, framework, request);

      const snapshotResponse = await getNodes(
        client,
        snapshotRequest,
        source,
        compositeSize,
        logQueryFields
      );
      return SnapshotNodeResponseRT.encode(snapshotResponse);
    })
  );
};

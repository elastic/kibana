/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import SuperTest from 'supertest';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { ASSET_CRITICALITY_STATUS_URL } from '@kbn/security-solution-plugin/common/constants';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { routeWithNamespace } from '../../detections_response/utils';

export const cleanAssetCriticality = async ({
  log,
  es,
  namespace = 'default',
}: {
  log: ToolingLog;
  es: Client;
  namespace?: string;
}) => {
  try {
    await Promise.allSettled([
      es.indices.delete({
        index: [`.asset-criticality.asset-criticality-${namespace}`],
      }),
    ]);
  } catch (e) {
    log.warning(`Error deleting asset criticality index: ${e.message}`);
  }
};

export const assetCriticalityRouteHelpersFactory = (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  namespace?: string
) => ({
  status: async () =>
    await supertest
      .get(routeWithNamespace(ASSET_CRITICALITY_STATUS_URL, namespace))
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(200),
});

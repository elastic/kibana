/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import SuperTest from 'supertest';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { ENTITY_STORE_INIT_URL } from '@kbn/security-solution-plugin/common/constants';
import { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import { routeWithNamespace } from '../../../../common/utils/security_solution';

export const entityStoreRouteHelpersFactory = (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  namespace?: string
) => ({
  init: async () =>
    await supertest
      .post(routeWithNamespace(ENTITY_STORE_INIT_URL, namespace))
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send()
      .expect(200),
});

export const cleanEntityStore = async ({
  es,
  log,
}: {
  es: Client;
  log: ToolingLog;
}): Promise<void> => {
  await deleteEntityStoreIndices({ log, es });
};

const deleteEntityStoreIndices = async ({
  log,
  es,
  namespace = 'default',
}: {
  log: ToolingLog;
  es: Client;
  namespace?: string;
}) => {
  try {
    await es.indices.delete({
      index: [`.entities.entities-${namespace}`],
    });
  } catch (e) {
    log.warning(`Error deleting entity store indices: ${e.message}`);
  }
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../ftr_provider_context';
import { fleetSetupRouteService } from '../../../plugins/ingest_manager/common';

export function IngestManagerProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  return {
    async setup() {
      const headers = { accept: 'application/json', 'kbn-xsrf': 'some-xsrf-token' };

      await supertest
        .post(fleetSetupRouteService.postFleetSetupPath())
        .set(headers)
        .send({ forceRecreate: true })
        .expect(200);
    },
  };
}

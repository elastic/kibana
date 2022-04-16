/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fleetSetupRouteService } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../ftr_provider_context';

export function IngestManagerProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  return {
    async setup() {
      const headers = { accept: 'application/json', 'kbn-xsrf': 'some-xsrf-token' };

      await retry.try(async () => {
        await supertest
          .post(fleetSetupRouteService.postFleetSetupPath())
          .set(headers)
          .send({ forceRecreate: true })
          .expect(200);
      });
    },
  };
}

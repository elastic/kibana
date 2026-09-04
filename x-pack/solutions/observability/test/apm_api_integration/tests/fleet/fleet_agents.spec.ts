/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ApmApiError } from '../../common/apm_api_supertest';
import { getBettertest } from '../../common/bettertest';
import type { FtrProviderContext } from '../../common/ftr_provider_context';
import { setupFleet } from './helpers';

export default function ApiTest(ftrProviderContext: FtrProviderContext) {
  const { getService } = ftrProviderContext;
  const registry = getService('registry');
  const supertest = getService('supertest');
  const bettertest = getBettertest(supertest);
  const apmApiClient = getService('apmApiClient');

  registry.when('Fleet agents', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await setupFleet(bettertest);
    });

    describe('with apm_write privileges', () => {
      describe('when no agents are found', () => {
        it('returns empty', async () => {
          const { body } = await apmApiClient.writeUser({
            endpoint: 'GET /internal/apm/fleet/agents',
          });

          expect(body.fleetAgents).to.eql([]);
        });
      });
    });

    describe('without apm_write privileges', () => {
      it('returns forbidden', async () => {
        try {
          await apmApiClient.readUser({
            endpoint: 'GET /internal/apm/fleet/agents',
          });
          expect(true).to.be(false);
        } catch (e) {
          const err = e as ApmApiError;
          expect(err.res.status).to.be(403);
        }
      });
    });
  });
}

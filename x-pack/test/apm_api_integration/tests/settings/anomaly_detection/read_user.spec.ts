/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { ApmApiError } from '../../../common/apm_api_supertest';

export default function apiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  function getJobs() {
    return apmApiClient.writeUser({
      endpoint: `GET /internal/apm/settings/anomaly-detection/jobs`,
    });
  }

  function createJobs(environments: string[]) {
    return apmApiClient.readUser({
      endpoint: `POST /internal/apm/settings/anomaly-detection/jobs`,
      params: {
        body: { environments },
      },
    });
  }

  registry.when('ML jobs', { config: 'trial', archives: [] }, () => {
    describe('when user has read access to ML', () => {
      describe('when calling the endpoint for listing jobs', () => {
        it('returns a list of jobs', async () => {
          const { body } = await getJobs();

          expect(body.jobs.length).to.be(0);
          expect(body.hasLegacyJobs).to.be(false);
        });
      });

      describe('when calling create endpoint', () => {
        it('returns an error because the user does not have access', async () => {
          try {
            await createJobs(['production', 'staging']);
            expect(true).to.be(false);
          } catch (e) {
            const err = e as ApmApiError;
            expect(err.res.status).to.be(403);
          }
        });
      });
    });
  });
}

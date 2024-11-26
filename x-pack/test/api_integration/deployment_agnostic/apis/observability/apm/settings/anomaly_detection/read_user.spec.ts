/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import type { ApmApiError } from '../../../../../services/apm_api';

export default function apiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');

  function getJobs() {
    return apmApiClient.readUser({ endpoint: `GET /internal/apm/settings/anomaly-detection/jobs` });
  }

  function createJobs(environments: string[]) {
    return apmApiClient.readUser({
      endpoint: `POST /internal/apm/settings/anomaly-detection/jobs`,
      params: {
        body: { environments },
      },
    });
  }

  describe('ML jobs', () => {
    describe(`when readUser has read access to ML`, () => {
      describe('when calling the endpoint for listing jobs', () => {
        it('returns a list of jobs', async () => {
          const { body } = await getJobs();

          expect(body.jobs).not.to.be(undefined);
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

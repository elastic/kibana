/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ApmApiError } from '../../../common/apm_api_supertest';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { expectToReject } from '../../../common/utils/expect_to_reject';

export default function apiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  function getJobs() {
    return apmApiClient.noAccessUser({
      endpoint: 'GET /internal/apm/settings/anomaly-detection/jobs',
    });
  }

  function createJobs(environments: string[]) {
    return apmApiClient.noAccessUser({
      endpoint: 'POST /internal/apm/settings/anomaly-detection/jobs',
      params: {
        body: {
          environments,
        },
      },
    });
  }

  registry.when('ML jobs', { config: 'trial', archives: [] }, () => {
    describe('when user does not have read access to ML', () => {
      describe('when calling the endpoint for listing jobs', () => {
        it('returns an error because the user does not have access', async () => {
          const err = await expectToReject<ApmApiError>(() => getJobs());

          expect(err.res.status).to.be(403);
          expect(err.res.body.message).eql('Forbidden');
        });
      });

      describe('when calling create endpoint', () => {
        it('returns an error because the user does not have access', async () => {
          const err = await expectToReject<ApmApiError>(() =>
            createJobs(['production', 'staging'])
          );

          expect(err.res.status).to.be(403);
          expect(err.res.body.message).eql('Forbidden');
        });
      });
    });
  });
}

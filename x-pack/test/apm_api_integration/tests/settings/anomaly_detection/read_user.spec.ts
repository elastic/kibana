/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function apiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmReadUser = getService('legacySupertestAsApmReadUser');

  function getJobs() {
    return apmReadUser.get(`/internal/apm/settings/anomaly-detection/jobs`).set('kbn-xsrf', 'foo');
  }

  function createJobs(environments: string[]) {
    return apmReadUser
      .post(`/internal/apm/settings/anomaly-detection/jobs`)
      .send({ environments })
      .set('kbn-xsrf', 'foo');
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
          const { body } = await createJobs(['production', 'staging']);

          expect(body.statusCode).to.be(403);
          expect(body.error).to.be('Forbidden');
        });
      });
    });
  });
}

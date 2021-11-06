/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { countBy } from 'lodash';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function apiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const legacyWriteUserClient = getService('legacySupertestAsApmWriteUser');

  function getJobs() {
    return apmApiClient.writeUser({
      endpoint: `GET /internal/apm/settings/anomaly-detection/jobs`,
    });
  }

  function createJobs(environments: string[]) {
    return apmApiClient.writeUser({
      endpoint: `POST /internal/apm/settings/anomaly-detection/jobs`,
      params: {
        body: { environments },
      },
    });
  }

  function deleteJobs(jobIds: string[]) {
    return legacyWriteUserClient
      .post(`/api/ml/jobs/delete_jobs`)
      .send({ jobIds })
      .set('kbn-xsrf', 'foo');
  }

  registry.when('ML jobs', { config: 'trial', archives: [] }, () => {
    describe('when user has write access to ML', () => {
      after(async () => {
        const res = await getJobs();
        const jobIds = res.body.jobs.map((job: any) => job.job_id);
        await deleteJobs(jobIds);
      });

      describe('when calling the endpoint for listing jobs', () => {
        it('returns a list of jobs', async () => {
          const { body } = await getJobs();
          expect(body.jobs.length).to.be(0);
          expect(body.hasLegacyJobs).to.be(false);
        });
      });

      describe('when calling create endpoint', () => {
        it('creates two jobs', async () => {
          await createJobs(['production', 'staging']);

          const { body } = await getJobs();
          expect(body.hasLegacyJobs).to.be(false);
          expect(countBy(body.jobs, 'environment')).to.eql({
            production: 1,
            staging: 1,
          });
        });

        describe('with existing ML jobs', () => {
          before(async () => {
            await createJobs(['production', 'staging']);
          });
          it('skips duplicate job creation', async () => {
            await createJobs(['production', 'test']);

            const { body } = await getJobs();
            expect(countBy(body.jobs, 'environment')).to.eql({
              production: 1,
              staging: 1,
              test: 1,
            });
          });
        });
      });
    });
  });
}

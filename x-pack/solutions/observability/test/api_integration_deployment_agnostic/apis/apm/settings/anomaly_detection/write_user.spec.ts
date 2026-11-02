/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { countBy } from 'lodash';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function apiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApi = getService('apmApi');
  const ml = getService('ml');

  function getJobs() {
    return apmApi.writeUser({
      endpoint: `GET /internal/apm/settings/anomaly-detection/jobs`,
    });
  }

  function createJobs(environments: string[]) {
    return apmApi.writeUser({
      endpoint: `POST /internal/apm/settings/anomaly-detection/jobs`,
      params: {
        body: { environments },
      },
    });
  }

  function deleteJobs(jobIds: string[]) {
    return Promise.allSettled(jobIds.map((jobId) => ml.api.deleteAnomalyDetectionJobES(jobId)));
  }

  describe('ML jobs', () => {
    describe('when writeUser has write access to ML', () => {
      before(async () => {
        const res = await getJobs();
        const jobIds = res.body.jobs.map((job: any) => job.jobId);
        await deleteJobs(jobIds);
      });

      after(async () => {
        const res = await getJobs();
        const jobIds = res.body.jobs.map((job: any) => job.jobId);
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
        beforeEach(async () => {
          const res = await getJobs();
          const jobIds = res.body.jobs.map((job: any) => job.jobId);
          await deleteJobs(jobIds);
        });

        it('creates two jobs', async () => {
          await createJobs(['production', 'staging']);

          const { body } = await getJobs();
          expect(body.hasLegacyJobs).to.be(false);
          expect(countBy(body.jobs, 'environment')).to.eql({
            production: 1,
            staging: 1,
          });
        });

        it('creates job with long environment name', async () => {
          const longEnvironmentName =
            'Production: This Is A Deliberately Long Environment Name To Test Limits - 1234567890';
          const { status } = await createJobs([longEnvironmentName]);
          expect(status).to.be(200);
        });

        it('skips duplicate job creation', async () => {
          await createJobs(['production', 'staging']);
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
}

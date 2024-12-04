/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { countBy } from 'lodash';
import { ApmApiClientKey, UserApiClient } from '../../../common/config';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function apiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const ml = getService('ml');

  function getJobs({ user }: UserApiClient = { user: 'writeUser' }) {
    return apmApiClient[user]({
      endpoint: `GET /internal/apm/settings/anomaly-detection/jobs`,
    });
  }

  function createJobs(environments: string[], { user }: UserApiClient = { user: 'writeUser' }) {
    return apmApiClient[user]({
      endpoint: `POST /internal/apm/settings/anomaly-detection/jobs`,
      params: {
        body: { environments },
      },
    });
  }

  function deleteJobs(jobIds: string[]) {
    return Promise.allSettled(jobIds.map((jobId) => ml.deleteAnomalyDetectionJobES(jobId)));
  }

  registry.when('ML jobs', { config: 'trial', archives: [] }, () => {
    (['apmReadPrivilegesWithWriteSettingsUser'] as ApmApiClientKey[]).forEach((user) => {
      describe(`when ${user} has write access to ML`, () => {
        before(async () => {
          const res = await getJobs({ user });
          const jobIds = res.body.jobs.map((job: any) => job.jobId);
          await deleteJobs(jobIds);
        });

        after(async () => {
          const res = await getJobs({ user });
          const jobIds = res.body.jobs.map((job: any) => job.jobId);
          await deleteJobs(jobIds);
        });

        describe('when calling the endpoint for listing jobs', () => {
          it('returns a list of jobs', async () => {
            const { body } = await getJobs({ user });
            expect(body.jobs.length).to.be(0);
            expect(body.hasLegacyJobs).to.be(false);
          });
        });

        describe('when calling create endpoint', () => {
          it('creates two jobs', async () => {
            await createJobs(['production', 'staging'], { user });

            const { body } = await getJobs({ user });
            expect(body.hasLegacyJobs).to.be(false);
            expect(countBy(body.jobs, 'environment')).to.eql({
              production: 1,
              staging: 1,
            });
          });

          describe('with existing ML jobs', () => {
            before(async () => {
              await createJobs(['production', 'staging'], { user });
            });
            it('skips duplicate job creation', async () => {
              await createJobs(['production', 'test'], { user });

              const { body } = await getJobs({ user });
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
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function apiTest({ getService }: FtrProviderContext) {
  const apmWriteUser = getService('supertestAsApmWriteUser');

  function getJobs() {
    return apmWriteUser.get(`/api/apm/settings/anomaly-detection`).set('kbn-xsrf', 'foo');
  }

  function createJobs(environments: string[]) {
    return apmWriteUser
      .post(`/api/apm/settings/anomaly-detection/jobs`)
      .send({ environments })
      .set('kbn-xsrf', 'foo');
  }

  function deleteJobs(jobIds: string[]) {
    return apmWriteUser.post(`/api/ml/jobs/delete_jobs`).send({ jobIds }).set('kbn-xsrf', 'foo');
  }

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
        expect(body.jobs.map((job: any) => job.environment)).to.eql(['production', 'staging']);
      });
    });
  });
}

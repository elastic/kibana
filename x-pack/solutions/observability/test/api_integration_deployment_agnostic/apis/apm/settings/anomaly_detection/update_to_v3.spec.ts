/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function apiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApi = getService('apmApi');
  const ml = getService('ml');
  const es = getService('es');

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

  async function createV2Jobs(environments: string[]) {
    await createJobs(environments);

    const { body } = await getJobs();

    for (const mlJob of body.jobs) {
      await es.ml.updateJob({
        job_id: mlJob.jobId,
        custom_settings: {
          job_tags: {
            apm_ml_version: '2',
            environment: mlJob.environment,
          },
        },
      });
    }
  }

  async function createV3Jobs(environments: string[]) {
    await createJobs(environments);
  }

  function callUpdateEndpoint() {
    return apmApi.writeUser({
      endpoint: 'POST /internal/apm/settings/anomaly-detection/update_to_v3',
    });
  }

  describe('Updating ML jobs to v3', () => {
    before(async () => {
      // Ensure a clean state before running the test suite
      await ml.api.cleanMlIndices();
    });

    describe('when there are no v2 jobs', () => {
      it('returns a 200/true', async () => {
        const { status, body } = await callUpdateEndpoint();
        expect(status).to.eql(200);
        expect(body.update).to.eql(true);
      });
    });

    describe('when there are only v2 jobs', () => {
      before(async () => {
        await ml.api.cleanMlIndices();
        await createV2Jobs(['production', 'development']);
      });
      it('creates a new job for each environment that has a v2 job', async () => {
        await callUpdateEndpoint();

        const {
          body: { jobs },
        } = await getJobs();

        expect(
          jobs
            .filter((job) => job.version === 3)
            .map((job) => job.environment)
            .sort()
        ).to.eql(['development', 'production']);
      });

      after(async () => {
        await ml.api.cleanMlIndices();
      });
    });

    describe('when there are both v2 and v3 jobs', () => {
      before(async () => {
        await ml.api.cleanMlIndices();
        await createV2Jobs(['production', 'development']);
        await createV3Jobs(['production']);
      });

      after(async () => {
        await ml.api.cleanMlIndices();
      });

      it('only creates new jobs for environments that did not have a v3 job', async () => {
        await callUpdateEndpoint();

        const {
          body: { jobs },
        } = await getJobs();

        expect(
          jobs
            .filter((job) => job.version === 3)
            .map((job) => job.environment)
            .sort()
        ).to.eql(['development', 'production']);
      });
    });
  });
}

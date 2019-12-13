/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { API_BASE_PATH, ROLLUP_INDEX_NAME } from './constants';

import { registerHelpers } from './rollup.test_helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  const {
    createIndexWithMappings,
    getJobPayload,
    loadJobs,
    createJob,
    deleteJob,
    startJob,
    stopJob,
    cleanUp,
  } = registerHelpers({ supertest, es });

  describe('jobs', () => {
    after(() => cleanUp());

    describe('indices', () => {
      it('should return an empty object when there are no rollup indices', async () => {
        const uri = `${API_BASE_PATH}/indices`;

        const { body } = await supertest
          .get(uri)
          .expect(200);

        expect(body).to.eql({});
      });
    });

    describe('Index patterns', () => {
      it('should return the date, numeric and keyword fields when an index pattern matches indices', async () => {
        const indexName = await createIndexWithMappings();

        const uri = `${API_BASE_PATH}/index_pattern_validity/${indexName}`;

        const { body } = await supertest
          .get(uri)
          .expect(200);

        expect(body).to.eql({
          dateFields: ['testCreatedField'],
          keywordFields: ['testTagField'],
          numericFields: ['testTotalField'],
          doesMatchIndices: true,
          doesMatchRollupIndices: false,
        });
      });

      it('should not return any fields when the index pattern doesn\'t match any indices', async () => {
        const uri = `${API_BASE_PATH}/index_pattern_validity/index-does-not-exist`;

        const { body } = await supertest
          .get(uri)
          .expect(200);

        expect(body).to.eql({
          dateFields: [],
          keywordFields: [],
          numericFields: [],
          doesMatchIndices: false,
          doesMatchRollupIndices: false,
        });
      });
    });

    describe('crud', () => {
      describe('list', () => {
        it('should return an empty array when there are no jobs', async () => {
          const { body } = await loadJobs().expect(200);

          expect(body).to.eql({ jobs: [] });
        });
      });

      describe('create', () => {
        let indexName;

        beforeEach(async () => {
          indexName = await createIndexWithMappings();
        });

        it('should create a rollup job', async () => {
          const payload = getJobPayload(indexName);

          return createJob(payload).expect(200);
        });

        it('should throw a 409 conflict when trying to create 2 jobs with the same id', async () => {
          const payload = getJobPayload(indexName);

          await createJob(payload);

          return createJob(payload).expect(409);
        });

        it('should handle ES errors', async () => {
          const payload = { job: { id: 'abc', invalid: 'property' } };

          const { body } = await createJob(payload);
          expect(body.message).to.contain('unknown field [invalid]');
        });

        it('should list the newly created job', async () => {
          const payload = getJobPayload(indexName);
          await createJob(payload);

          const { body: { jobs } } = await loadJobs();
          const job = jobs.find(job => job.config.id === payload.job.id);

          expect(job).not.be(undefined);
          expect(job.config.index_pattern).to.eql(payload.job.index_pattern);
          expect(job.config.rollup_index).to.eql(payload.job.rollup_index);
        });

        it('should create the underlying rollup index with the correct aggregations', async () => {
          await createJob(getJobPayload(indexName));

          const { body } = await supertest.get(`${API_BASE_PATH}/indices`);

          expect(body[ROLLUP_INDEX_NAME]).to.not.be(undefined);

          expect(body).to.eql({
            'rollup_index': {
              'aggs': {
                'date_histogram': {
                  'testCreatedField': {
                    'agg': 'date_histogram',
                    'delay': '1d',
                    // TODO: Note that we created the job with `interval`, but ES has coerced this to
                    // `fixed_interval` based on the value we provided. Once we update the UI and
                    // tests to no longer use the deprecated `interval` property, we can remove
                    // this comment.
                    'fixed_interval': '24h',
                    'time_zone': 'UTC'
                  }
                },
                'max': {
                  'testCreatedField': {
                    'agg': 'max'
                  }
                },
                'min': {
                  'testCreatedField': {
                    'agg': 'min'
                  }
                },
                'terms': {
                  'testTagField': {
                    'agg': 'terms'
                  },
                  'testTotalField': {
                    'agg': 'terms'
                  }
                },
                'histogram': {
                  'testTotalField': {
                    'agg': 'histogram',
                    'interval': 7
                  }
                },
                'avg': {
                  'testTotalField': {
                    'agg': 'avg'
                  }
                },
                'value_count': {
                  'testTotalField': {
                    'agg': 'value_count'
                  }
                }
              }
            }
          });
        });
      });

      describe('delete', () => {
        let jobId;

        beforeEach(async () => {
          const indexName = await createIndexWithMappings();
          const payload = getJobPayload(indexName);
          jobId = payload.job.id;
          await createJob(payload);
        });

        it('should delete a job that has been stopped', async () => {
          await stopJob(jobId);
          const { body } = await deleteJob(jobId).expect(200);
          expect(body).to.eql({ success: true });
        });

        it('should throw a 400 error if trying to delete a job that is started', async () => {
          await startJob(jobId);
          const { body } = await deleteJob(jobId).expect(400);
          expect(body.message).to.contain('Job must be [STOPPED] before deletion');
        });
      });
    });

    describe('actions', () => {
      describe('start', () => {
        let job;

        beforeEach(async () => {
          const indexName = await createIndexWithMappings();
          const payload = getJobPayload(indexName);
          await createJob(payload);

          const { body: { jobs } } = await loadJobs();
          job = jobs.find(job => job.config.id === payload.job.id);
        });

        it('should start the job', async () => {
          expect(job.status.job_state).to.eql('stopped');

          const { body } = await startJob(job.config.id).expect(200);

          expect(body).to.eql({ success: true });

          // Fetch the job to make sure it has been started
          const jobId = job.config.id;
          const { body: { jobs } } = await loadJobs();
          job = jobs.find(job => job.config.id === jobId);
          expect(job.status.job_state).to.eql('started');
        });

        it('should return 200 if the job is already started', async () => {
          await startJob(job.config.id); // Start the job
          await startJob(job.config.id).expect(200);
        });
      });

      describe('stop', () => {
        let job;

        beforeEach(async () => {
          const indexName = await createIndexWithMappings();
          const payload = getJobPayload(indexName);
          await createJob(payload);

          const { body: { jobs } } = await loadJobs();
          job = jobs.find(job => job.config.id === payload.job.id);
        });

        it('should stop the job', async () => {
          await startJob(job.config.id);
          const { body } = await stopJob(job.config.id).expect(200);

          expect(body).to.eql({ success: true });

          // Fetch the job to make sure it has been stopped
          const jobId = job.config.id;
          const { body: { jobs } } = await loadJobs();
          job = jobs.find(job => job.config.id === jobId);
          expect(job.status.job_state).to.eql('stopped');
        });

        it('should return 200 if the job is already stopped', async () => {
          await stopJob(job.config.id).expect(200);
        });
      });
    });
  });
}

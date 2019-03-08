/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { API_BASE_PATH, ROLLUP_INDEX_NAME } from './constants';

import { registerHelpers } from './rollup.test_helpers';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');

  const {
    createIndexWithMappings,
    getJobPayload,
    createJob,
    deleteJob,
    startJob,
    cleanUp,
  } = registerHelpers({ supertest, es });

  describe('Rollup jobs', () => {
    after(() => cleanUp());

    describe('Rollup indices', () => {
      it('should return an empty object when there are no rollup indices', async () => {
        const uri = `${API_BASE_PATH}/indices`;

        const { body } = await supertest
          .get(uri)
          .expect(200);

        expect(body).to.eql({});
      });
    });

    describe('Index patterns', () => {
      it('should return the date, numeric and keyword fields when an index (pattern) is found', async () => {
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

      it('should not return any fields when no index (pattern) is found', async () => {
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

    describe('Crud', () => {
      describe('list', () => {
        it('should return an empty array when there are no jobs', async () => {
          const { body } = await supertest
            .get(`${API_BASE_PATH}/jobs`)
            .expect(200);

          expect(body).to.eql({ jobs: [] });
        });
      });

      describe('create', () => {
        it('should create a rollup job', async () => {
          const indexName = await createIndexWithMappings();
          const payload = getJobPayload(indexName);

          return createJob(payload).expect(200);
        });

        it('should throw a 409 conflict when trying to create 2 jobs with the same id', async () => {
          const indexName = await createIndexWithMappings();
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
          const indexName = await createIndexWithMappings();
          const payload = getJobPayload(indexName);
          await createJob(payload);

          const { body: { jobs } } = await supertest.get(`${API_BASE_PATH}/jobs`);
          const job = jobs.find(job => job.config.id === payload.job.id);

          expect(job).not.be(undefined);
          expect(job.config.index_pattern).to.eql(payload.job.index_pattern);
          expect(job.config.rollup_index).to.eql(payload.job.rollup_index);
        });

        it('should create the underlying rollup index with the correct aggregations', async () => {
          const indexName = await createIndexWithMappings();
          await createJob(getJobPayload(indexName));

          const { body } = await supertest.get(`${API_BASE_PATH}/indices`);

          expect(body[ROLLUP_INDEX_NAME]).to.not.be(undefined);

          // Those are all the aggregations that we defined in the getJobPayload() above
          const expectedAggregations = [
            'date_histogram',
            'max',
            'min',
            'terms',
            'histogram',
            'avg',
            'value_count',
          ];

          const aggregations = Object.keys(body[ROLLUP_INDEX_NAME].aggs);
          expect(aggregations).to.eql(expectedAggregations);
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

        it('should delete a job that was created', async () => {
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

    describe('Actions', () => {
      describe('start job', () => {
        let job;

        beforeEach(async () => {
          const indexName = await createIndexWithMappings();
          const payload = getJobPayload(indexName);
          await createJob(payload);

          const { body: { jobs } } = await supertest.get(`${API_BASE_PATH}/jobs`);
          job = jobs.find(job => job.config.id === payload.job.id);
        });

        it('should start the job', async () => {
          expect(job.status.job_state).to.eql('stopped');

          const { body } = await startJob(job.config.id).expect(200);

          expect(body).to.eql({ success: true });
        });

        it('should throw a 400 Bad request if the job is already started', async () => {
          await startJob(job.config.id); // Start the job
          const { body } = await startJob(job.config.id)
            .expect(400);

          expect(body.error).to.eql('Bad Request');
          expect(body.message).to.contain('Cannot start task for Rollup Job');
        });
      });
    });
  });
}

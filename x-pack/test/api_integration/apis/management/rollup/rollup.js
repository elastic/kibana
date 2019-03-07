/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { API_BASE_PATH } from './constants';
import { initElasticsearchIndicesHelpers, getRandomString } from './lib';

const INDEX_TO_ROLLUP_MAPPINGS = {
  properties: {
    testTotalField: { 'type': 'long'  },
    testTagField: { 'type': 'keyword'  },
    testCreatedField: { 'type': 'date'  },
  }
};

const ROLLUP_INDEX_NAME = 'rollup_index';

export default function ({ getService }) {
  const jobsCreated = [];

  const supertest = getService('supertest');
  const es = getService('es');
  const { createIndex, deleteAllIndices } = initElasticsearchIndicesHelpers(es);

  const getJobPayload = (indexName, id = getRandomString()) => ({
    job: {
      id,
      index_pattern: indexName,
      rollup_index: ROLLUP_INDEX_NAME,
      cron: '0 0 0 ? * 7',
      page_size: 1000,
      groups: {
        date_histogram: {
          interval: '24h',
          delay: '1d',
          time_zone: 'UTC',
          field: 'testCreatedField'
        },
        terms: {
          fields: ['testTotalField', 'testTagField']
        },
        histogram: {
          interval: '7',
          fields: ['testTotalField']
        }
      },
      metrics: [{
        field: 'testTotalField',
        metrics: ['avg', 'value_count']
      }, {
        field: 'testCreatedField',
        metrics: ['max', 'min']
      }]
    }
  });

  const createJob = (payload) => {
    jobsCreated.push(payload.job.id);

    return supertest
      .put(`${API_BASE_PATH}/create`)
      .set('kbn-xsrf', 'xxx')
      .send(payload);
  };

  const deleteJob = (id) => {
    const jobIds = Array.isArray(id) ? id : [id];

    return supertest
      .post(`${API_BASE_PATH}/delete`)
      .set('kbn-xsrf', 'xxx')
      .send({ jobIds });
  };

  const deleteJobsCreated = (ids = jobsCreated) => (
    deleteJob(ids)
      .then(() => supertest.get(`${API_BASE_PATH}/jobs`))
      .then(({ body: { jobs } }) => {
        if (jobs.length) {
          // There are still some jobs left to delete. Call recursively
          // until all rollup jobs are removed.
          return deleteJobsCreated(jobs.map(job => job.id));
        }
      })
  );

  const deleteIndicesGeneratedByJobs = () => (
    supertest.get(`${API_BASE_PATH}/indices`)
      .then(({ body }) => {
        const index = Object.keys(body);
        if (!index.length) {
          return;
        }
        return es.indices.delete({ index });
      })
  );

  const cleanUp = () => (
    Promise.all([
      deleteAllIndices(),
      deleteJobsCreated(),
      deleteIndicesGeneratedByJobs(),
    ]).catch(err => {
      console.log('ERROR cleaning up!');
      throw(err);
    })
  );

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
        const indexCreateBody = { mappings: INDEX_TO_ROLLUP_MAPPINGS };
        const indexName = await createIndex(undefined, indexCreateBody);

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

    describe('Jobs (CRUD)', () => {
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
          const body = { mappings: INDEX_TO_ROLLUP_MAPPINGS };
          const indexName = await createIndex(undefined, body);

          const payload = getJobPayload(indexName);

          return createJob(payload).expect(200);
        });

        it('should throw a 409 conflict when trying to create 2 jobs with the same id', async () => {
          const body = { mappings: INDEX_TO_ROLLUP_MAPPINGS };
          const indexName = await createIndex(undefined, body);

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
          const indexName = await createIndex(undefined, { mappings: INDEX_TO_ROLLUP_MAPPINGS });
          const payload = getJobPayload(indexName);
          await createJob(payload);

          const { body: { jobs } } = await supertest.get(`${API_BASE_PATH}/jobs`);
          const job = jobs.find(job => job.config.id === payload.job.id);

          expect(job).not.be(undefined);
          expect(job.config.index_pattern).to.eql(payload.job.index_pattern);
          expect(job.config.rollup_index).to.eql(payload.job.rollup_index);
        });

        it('should create the underlying rollup index with the correct aggregations', async () => {
          const indexName = await createIndex(undefined, { mappings: INDEX_TO_ROLLUP_MAPPINGS });
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
        it('should delete a job that was created', async () => {
          const indexCreateBody = { mappings: INDEX_TO_ROLLUP_MAPPINGS };
          const indexName = await createIndex(undefined, indexCreateBody);
          const payload = getJobPayload(indexName);
          await createJob(payload);

          const { body } = await deleteJob(payload.job.id).expect(200);
          expect(body).to.eql({ success: true });
        });
      });
    });

    describe('Jobs (Actions)', () => {
      describe('start', () => {

      });

      describe('stop', () => {

      });
    });
  });
}

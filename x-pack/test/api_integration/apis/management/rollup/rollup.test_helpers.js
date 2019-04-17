/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initElasticsearchIndicesHelpers, getRandomString } from './lib';
import { API_BASE_PATH, ROLLUP_INDEX_NAME, INDEX_TO_ROLLUP_MAPPINGS } from './constants';

const jobsCreated = [];
const jobsStarted = [];

export const registerHelpers = ({ supertest, es }) => {
  const { createIndex, deleteIndex, deleteAllIndicesCreated } = initElasticsearchIndicesHelpers(es);

  const createIndexWithMappings = (indexName = undefined, mappings = INDEX_TO_ROLLUP_MAPPINGS) => {
    return createIndex(indexName, { mappings });
  };

  const getJobPayload = (indexName, id = getRandomString(), rollupIndex = ROLLUP_INDEX_NAME) => ({
    job: {
      id,
      index_pattern: indexName,
      rollup_index: rollupIndex,
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

  const startJob = (ids) => {
    const jobIds = Array.isArray(ids) ? ids : [ids];
    jobsStarted.concat(jobIds);

    return supertest
      .post(`${API_BASE_PATH}/start`)
      .set('kbn-xsrf', 'xxx')
      .send({ jobIds });
  };

  const stopJob = (ids) => {
    const jobIds = Array.isArray(ids) ? ids : [ids];

    return supertest
      .post(`${API_BASE_PATH}/stop?waitForCompletion=true`)
      .set('kbn-xsrf', 'xxx')
      .send({ jobIds });
  };

  const loadJobs = () => supertest.get(`${API_BASE_PATH}/jobs`);

  const stopAllJobs = () => (
    loadJobs()
      .then(async ({ body: { jobs } }) => {
        const jobIds = jobs.map(job => job.config.id);

        await stopJob(jobIds);

        return jobIds;
      })
  );

  const deleteIndicesGeneratedByJobs = () => (
    supertest.get(`${API_BASE_PATH}/indices`)
      .then(({ status, body }) => {

        if (status !== 200) {
          throw new Error(`Error fetching rollup indices with error: "${JSON.stringify(body)}"`);
        }

        const index = Object.keys(body);

        if (!index.length) {
          return;
        }

        return deleteIndex(index);
      })
  );

  const cleanUp = () => (
    Promise.all([
      stopAllJobs().then(deleteJob),
      deleteIndicesGeneratedByJobs().then(deleteAllIndicesCreated),
    ]).catch(err => {
      console.log('ERROR cleaning up!');
      throw err;
    })
  );

  return {
    createIndexWithMappings,
    getJobPayload,
    loadJobs,
    createJob,
    deleteJob,
    startJob,
    stopJob,
    cleanUp,
  };
};

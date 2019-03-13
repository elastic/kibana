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
  const { createIndex, deleteAllIndices } = initElasticsearchIndicesHelpers(es);

  const createIndexWithMappings = (indexName = undefined, mappings = INDEX_TO_ROLLUP_MAPPINGS) => {
    return createIndex(indexName, { mappings });
  };

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
      .post(`${API_BASE_PATH}/stop`)
      .set('kbn-xsrf', 'xxx')
      .send({ jobIds });
  };

  const stopAllJobStarted = (jobIds = jobsStarted, attempt = 0) => (
    stopJob(jobIds)
      .then(() => supertest.get(`${API_BASE_PATH}/jobs`))
      .then(({ body: { jobs } }) => {
        // We make sure that there are no more jobs started
        // as trying to delete a job that is started will throw an exception
        const jobsStillStarted = jobs.filter(job => job.status.job_state === 'started').map(job => job.config.id);

        if (jobsStillStarted.length && attempt < 3) {
          return stopAllJobStarted(jobsStillStarted, ++attempt);
        } else if(jobsStillStarted.length) {
          throw new Error('Error trying to stop jobs started');
        }
      })
  );

  const deleteJobsCreated = (ids = jobsCreated, attempt = 0) => (
    deleteJob(ids)
      .then((response) => {
        if (response.status !== 200 && response.status !== 404) {
          throw response;
        }
      })
      .then(() => supertest.get(`${API_BASE_PATH}/jobs`))
      .then(({ body: { jobs } }) => {
        if (jobs.length && attempt < 3) {
          // There are still some jobs left to delete.
          // Call recursively until all rollup jobs are removed.
          return deleteJobsCreated(jobs.map(job => job.config.id), ++attempt);
        } else if (jobs.length) {
          throw new Error('Error trying to delete Jobs created');
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
      stopAllJobStarted().then(() => deleteJobsCreated()),
      deleteIndicesGeneratedByJobs(),
    ]).catch(err => {
      console.log('ERROR cleaning up!');
      throw(err);
    })
  );

  return {
    createIndexWithMappings,
    getJobPayload,
    createJob,
    deleteJob,
    startJob,
    stopJob,
    cleanUp,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test';
import fs from 'fs';
import path from 'path';
import { Calendar } from '../../../../plugins/ml/server/models/calendar/index';
import { Annotation } from '../../../../plugins/ml/common/types/annotations';
import { DataFrameAnalyticsConfig } from '../../../../plugins/ml/public/application/data_frame_analytics/common';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATAFEED_STATE, JOB_STATE } from '../../../../plugins/ml/common/constants/states';
import { DataFrameTaskStateType } from '../../../../plugins/ml/common/types/data_frame_analytics';
import { DATA_FRAME_TASK_STATE } from '../../../../plugins/ml/common/constants/data_frame_analytics';
import { Datafeed, Job } from '../../../../plugins/ml/common/types/anomaly_detection_jobs';
import { JobType } from '../../../../plugins/ml/common/types/saved_objects';
import {
  ML_ANNOTATIONS_INDEX_ALIAS_READ,
  ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
} from '../../../../plugins/ml/common/constants/index_patterns';
import { COMMON_REQUEST_HEADERS } from '../../../functional/services/ml/common_api';
import { PutTrainedModelConfig } from '../../../../plugins/ml/common/types/trained_models';

export type MlApi = ProvidedType<typeof MachineLearningAPIProvider>;

type ModelType = 'regression' | 'classification';

export function MachineLearningAPIProvider({ getService }: FtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');
  const esSupertest = getService('esSupertest');
  const kbnSupertest = getService('supertest');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  return {
    assertResponseStatusCode(expectedStatus: number, actualStatus: number, responseBody: object) {
      expect(actualStatus).to.eql(
        expectedStatus,
        `Expected status code ${expectedStatus}, got ${actualStatus} with body '${JSON.stringify(
          responseBody
        )}'`
      );
    },

    async hasJobResults(jobId: string): Promise<boolean> {
      const body = await es.search({
        index: '.ml-anomalies-*',
        body: {
          size: 1,
          query: {
            match: {
              job_id: jobId,
            },
          },
        },
      });

      return body.hits.hits.length > 0;
    },

    async assertJobResultsExist(jobId: string) {
      await retry.waitForWithTimeout(`results for job ${jobId} to exist`, 30 * 1000, async () => {
        if ((await this.hasJobResults(jobId)) === true) {
          return true;
        } else {
          throw new Error(`expected results for job '${jobId}' to exist`);
        }
      });
    },

    async assertNoJobResultsExist(jobId: string) {
      await retry.waitForWithTimeout(
        `no results for job ${jobId} to exist`,
        30 * 1000,
        async () => {
          if ((await this.hasJobResults(jobId)) === false) {
            return true;
          } else {
            throw new Error(`expected no results for job '${jobId}' to exist`);
          }
        }
      );
    },

    async hasDetectorResults(jobId: string, detectorIndex: number): Promise<boolean> {
      const body = await es.search({
        index: '.ml-anomalies-*',
        body: {
          size: 1,
          query: {
            bool: {
              must: [
                {
                  match: {
                    job_id: jobId,
                  },
                },
                {
                  match: {
                    result_type: 'record',
                  },
                },
                {
                  match: {
                    detector_index: detectorIndex,
                  },
                },
              ],
            },
          },
        },
      });

      return body.hits.hits.length > 0;
    },

    async assertDetectorResultsExist(jobId: string, detectorIndex: number) {
      await retry.waitForWithTimeout(
        `results for detector ${detectorIndex} on job ${jobId} to exist`,
        30 * 1000,
        async () => {
          if ((await this.hasDetectorResults(jobId, detectorIndex)) === true) {
            return true;
          } else {
            throw new Error(
              `expected results for detector ${detectorIndex} on job '${jobId}' to exist`
            );
          }
        }
      );
    },

    async hasForecastResults(jobId: string): Promise<boolean> {
      const body = await es.search({
        index: '.ml-anomalies-*',
        body: {
          size: 1,
          query: {
            bool: {
              must: [
                {
                  match: {
                    job_id: jobId,
                  },
                },
                {
                  match: {
                    result_type: 'model_forecast',
                  },
                },
              ],
            },
          },
        },
      });

      return body.hits.hits.length > 0;
    },

    async assertForecastResultsExist(jobId: string) {
      await retry.waitForWithTimeout(
        `forecast results for job ${jobId} to exist`,
        30 * 1000,
        async () => {
          if ((await this.hasForecastResults(jobId)) === true) {
            return true;
          } else {
            throw new Error(`expected forecast results for job '${jobId}' to exist`);
          }
        }
      );
    },

    async createIndex(
      indices: string,
      mappings?: Record<string, estypes.MappingTypeMapping> | estypes.MappingTypeMapping
    ) {
      log.debug(`Creating indices: '${indices}'...`);
      if ((await es.indices.exists({ index: indices, allow_no_indices: false })) === true) {
        log.debug(`Indices '${indices}' already exist. Nothing to create.`);
        return;
      }

      const body = await es.indices.create({
        index: indices,
        ...(mappings ? { body: { mappings } } : {}),
      });
      expect(body)
        .to.have.property('acknowledged')
        .eql(true, 'Response for create request indices should be acknowledged.');

      await this.assertIndicesExist(indices);
      log.debug('> Indices created.');
    },

    async deleteIndices(indices: string) {
      log.debug(`Deleting indices: '${indices}'...`);
      if ((await es.indices.exists({ index: indices, allow_no_indices: false })) === false) {
        log.debug(`Indices '${indices}' don't exist. Nothing to delete.`);
        return;
      }

      const body = await es.indices.delete({
        index: indices,
      });
      expect(body)
        .to.have.property('acknowledged')
        .eql(true, 'Response for delete request should be acknowledged.');

      await this.assertIndicesNotToExist(indices);
      log.debug('> Indices deleted.');
    },

    async cleanMlIndices() {
      await esDeleteAllIndices('.ml-*');
    },

    async getJobState(jobId: string): Promise<JOB_STATE> {
      const jobStats = await this.getADJobStats(jobId);

      expect(jobStats.jobs).to.have.length(
        1,
        `Expected job stats to have exactly one job (got '${jobStats.length}')`
      );
      const state: JOB_STATE = jobStats.jobs[0].state;

      return state;
    },

    async getADJobStats(jobId: string): Promise<any> {
      log.debug(`Fetching anomaly detection job stats for job ${jobId}...`);
      const { body: jobStats, status } = await esSupertest.get(
        `/_ml/anomaly_detectors/${jobId}/_stats`
      );
      this.assertResponseStatusCode(200, status, jobStats);

      log.debug('> AD job stats fetched.');
      return jobStats;
    },

    async waitForJobState(
      jobId: string,
      expectedJobState: JOB_STATE,
      timeout: number = 2 * 60 * 1000
    ) {
      await retry.waitForWithTimeout(`job state to be ${expectedJobState}`, timeout, async () => {
        const state = await this.getJobState(jobId);
        if (state === expectedJobState) {
          return true;
        } else {
          throw new Error(`expected job state to be ${expectedJobState} but got ${state}`);
        }
      });
    },

    async getDatafeedState(datafeedId: string): Promise<DATAFEED_STATE> {
      log.debug(`Fetching datafeed state for datafeed ${datafeedId}`);
      const { body: datafeedStats, status } = await esSupertest.get(
        `/_ml/datafeeds/${datafeedId}/_stats`
      );
      this.assertResponseStatusCode(200, status, datafeedStats);

      expect(datafeedStats.datafeeds).to.have.length(
        1,
        `Expected datafeed stats to have exactly one datafeed (got '${datafeedStats.datafeeds.length}')`
      );
      const state: DATAFEED_STATE = datafeedStats.datafeeds[0].state;

      return state;
    },

    async waitForDatafeedState(
      datafeedId: string,
      expectedDatafeedState: DATAFEED_STATE,
      timeout: number = 2 * 60 * 1000
    ) {
      await retry.waitForWithTimeout(
        `datafeed state to be ${expectedDatafeedState}`,
        timeout,
        async () => {
          const state = await this.getDatafeedState(datafeedId);
          if (state === expectedDatafeedState) {
            return true;
          } else {
            throw new Error(`expected job state to be ${expectedDatafeedState} but got ${state}`);
          }
        }
      );
    },

    async getDFAJobStats(analyticsId: string): Promise<any> {
      log.debug(`Fetching data frame analytics job stats for job ${analyticsId}...`);
      const { body: analyticsStats, status } = await esSupertest.get(
        `/_ml/data_frame/analytics/${analyticsId}/_stats`
      );
      this.assertResponseStatusCode(200, status, analyticsStats);

      log.debug('> DFA job stats fetched.');
      return analyticsStats;
    },

    async getAnalyticsState(analyticsId: string): Promise<DataFrameTaskStateType> {
      log.debug(`Fetching analytics state for job ${analyticsId}`);
      const analyticsStats = await this.getDFAJobStats(analyticsId);

      expect(analyticsStats.data_frame_analytics).to.have.length(
        1,
        `Expected dataframe analytics stats to have exactly one object (got '${analyticsStats.data_frame_analytics.length}')`
      );

      const state: DataFrameTaskStateType = analyticsStats.data_frame_analytics[0].state;

      return state;
    },

    async getDFAJobTrainingRecordCount(analyticsId: string): Promise<number> {
      const analyticsStats = await this.getDFAJobStats(analyticsId);

      expect(analyticsStats.data_frame_analytics).to.have.length(
        1,
        `Expected dataframe analytics stats to have exactly one object (got '${analyticsStats.data_frame_analytics.length}')`
      );
      const trainingRecordCount: number =
        analyticsStats.data_frame_analytics[0].data_counts.training_docs_count;

      return trainingRecordCount;
    },

    async waitForDFAJobTrainingRecordCountToBePositive(analyticsId: string) {
      await retry.waitForWithTimeout(
        `'${analyticsId}' to have training_docs_count > 0`,
        60 * 1000,
        async () => {
          const trainingRecordCount = await this.getDFAJobTrainingRecordCount(analyticsId);
          if (trainingRecordCount > 0) {
            return true;
          } else {
            throw new Error(
              `expected data frame analytics job '${analyticsId}' to have training_docs_count > 0 (got ${trainingRecordCount})`
            );
          }
        }
      );
    },

    async waitForAnalyticsState(
      analyticsId: string,
      expectedAnalyticsState: DataFrameTaskStateType,
      timeoutInMs: number = 2 * 60 * 1000
    ) {
      await retry.waitForWithTimeout(
        `analytics state to be ${expectedAnalyticsState}`,
        timeoutInMs,
        async () => {
          const state = await this.getAnalyticsState(analyticsId);
          if (state === expectedAnalyticsState) {
            return true;
          } else {
            throw new Error(
              `expected analytics state to be ${expectedAnalyticsState} but got ${state}`
            );
          }
        }
      );
    },

    async assertIndicesExist(indices: string) {
      await retry.tryForTime(30 * 1000, async () => {
        if ((await es.indices.exists({ index: indices, allow_no_indices: false })) === true) {
          return true;
        } else {
          throw new Error(`indices '${indices}' should exist`);
        }
      });
    },

    async assertIndicesNotToExist(indices: string) {
      await retry.tryForTime(30 * 1000, async () => {
        if ((await es.indices.exists({ index: indices, allow_no_indices: false })) === false) {
          return true;
        } else {
          throw new Error(`indices '${indices}' should not exist`);
        }
      });
    },

    async assertIndicesNotEmpty(indices: string) {
      await retry.tryForTime(30 * 1000, async () => {
        const body = await es.search({
          index: indices,
          body: {
            size: 1,
          },
        });

        if (body.hits.hits.length > 0) {
          return true;
        } else {
          throw new Error(`indices '${indices}' should not be empty`);
        }
      });
    },

    async getCalendar(calendarId: string, expectedCode = 200) {
      const response = await esSupertest.get(`/_ml/calendars/${calendarId}`);
      this.assertResponseStatusCode(expectedCode, response.status, response.body);
      return response;
    },

    async createCalendar(
      calendarId: string,
      requestBody: Partial<Calendar> = { description: '', job_ids: [] }
    ) {
      log.debug(`Creating calendar with id '${calendarId}'...`);
      const { body, status } = await esSupertest
        .put(`/_ml/calendars/${calendarId}`)
        .send(requestBody);
      this.assertResponseStatusCode(200, status, body);

      await this.waitForCalendarToExist(calendarId);
      log.debug('> Calendar created.');
    },

    async deleteCalendar(calendarId: string) {
      log.debug(`Deleting calendar with id '${calendarId}'...`);
      await esSupertest.delete(`/_ml/calendars/${calendarId}`);

      await this.waitForCalendarNotToExist(calendarId);
      log.debug('> Calendar deleted.');
    },

    async waitForCalendarToExist(calendarId: string, errorMsg?: string) {
      await retry.waitForWithTimeout(`'${calendarId}' to exist`, 5 * 1000, async () => {
        if (await this.getCalendar(calendarId, 200)) {
          return true;
        } else {
          throw new Error(errorMsg || `expected calendar '${calendarId}' to exist`);
        }
      });
    },

    async waitForCalendarNotToExist(calendarId: string, errorMsg?: string) {
      await retry.waitForWithTimeout(`'${calendarId}' to not exist`, 5 * 1000, async () => {
        if (await this.getCalendar(calendarId, 404)) {
          return true;
        } else {
          throw new Error(errorMsg || `expected calendar '${calendarId}' to not exist`);
        }
      });
    },

    async createCalendarEvents(calendarId: string, events: estypes.MlCalendarEvent[]) {
      log.debug(`Creating events for calendar with id '${calendarId}'...`);
      const { body, status } = await esSupertest
        .post(`/_ml/calendars/${calendarId}/events`)
        .send({ events });
      this.assertResponseStatusCode(200, status, body);

      await this.waitForEventsToExistInCalendar(calendarId, events);
      log.debug('> Calendar events created.');
    },

    async getCalendarEvents(calendarId: string, expectedCode = 200) {
      const response = await esSupertest.get(`/_ml/calendars/${calendarId}/events`);
      this.assertResponseStatusCode(expectedCode, response.status, response.body);
      return response;
    },

    assertAllEventsExistInCalendar: (
      eventsToCheck: estypes.MlCalendarEvent[],
      calendar: Calendar
    ): boolean => {
      const updatedCalendarEvents = calendar.events;
      let allEventsAreUpdated = true;
      for (const eventToCheck of eventsToCheck) {
        // if at least one of the events that we need to check is not in the updated events
        // no need to continue
        if (
          updatedCalendarEvents.findIndex(
            (updatedEvent) =>
              updatedEvent.description === eventToCheck.description &&
              // updatedEvent are fetched with suptertest which converts start_time and end_time to number
              // sometimes eventToCheck declared manually with types incompatible with estypes.MlCalendarEvent
              String(updatedEvent.start_time) === String(eventToCheck.start_time) &&
              String(updatedEvent.end_time) === String(eventToCheck.end_time)
          ) < 0
        ) {
          allEventsAreUpdated = false;
          break;
        }
      }
      expect(allEventsAreUpdated).to.eql(
        true,
        `Expected calendar ${calendar.calendar_id} to contain events ${JSON.stringify(
          eventsToCheck
        )}`
      );
      return true;
    },

    async waitForEventsToExistInCalendar(
      calendarId: string,
      eventsToCheck: estypes.MlCalendarEvent[],
      errorMsg?: string
    ) {
      await retry.waitForWithTimeout(`'${calendarId}' events to exist`, 5 * 1000, async () => {
        // validate if calendar events have been updated with the requested events
        const { body } = await this.getCalendarEvents(calendarId, 200);

        if (this.assertAllEventsExistInCalendar(eventsToCheck, body)) {
          return true;
        } else {
          throw new Error(
            errorMsg ||
              `expected events for calendar '${calendarId}' to have been updated correctly`
          );
        }
      });
    },

    validateJobId(jobId: string) {
      if (jobId.match(/[\*,]/) !== null) {
        throw new Error(`No wildcards or list of ids supported in this context (got ${jobId})`);
      }
    },

    async getAnomalyDetectionJob(jobId: string) {
      const response = await esSupertest.get(`/_ml/anomaly_detectors/${jobId}`);
      this.assertResponseStatusCode(200, response.status, response.body);
      return response;
    },

    async adJobExist(jobId: string) {
      this.validateJobId(jobId);
      try {
        await this.getAnomalyDetectionJob(jobId);
        return true;
      } catch (err) {
        return false;
      }
    },

    async waitForAnomalyDetectionJobToExist(jobId: string, timeout: number = 5 * 1000) {
      await retry.waitForWithTimeout(`'${jobId}' to exist`, timeout, async () => {
        if (await this.getAnomalyDetectionJob(jobId)) {
          return true;
        } else {
          throw new Error(`expected anomaly detection job '${jobId}' to exist`);
        }
      });
    },

    async waitForAnomalyDetectionJobNotToExist(jobId: string, timeout: number = 5 * 1000) {
      await retry.waitForWithTimeout(`'${jobId}' to not exist`, timeout, async () => {
        const { status } = await esSupertest.get(`/_ml/anomaly_detectors/${jobId}`);

        if (status === 404) {
          return true;
        } else {
          throw new Error(`expected anomaly detection job '${jobId}' not to exist`);
        }
      });
    },

    async createAnomalyDetectionJob(jobConfig: Job, space?: string) {
      const jobId = jobConfig.job_id;
      log.debug(
        `Creating anomaly detection job with id '${jobId}' ${
          space ? `in space '${space}' ` : ''
        }...`
      );

      const { body, status } = await kbnSupertest
        .put(`${space ? `/s/${space}` : ''}/api/ml/anomaly_detectors/${jobId}`)
        .set(COMMON_REQUEST_HEADERS)
        .send(jobConfig);
      this.assertResponseStatusCode(200, status, body);

      await this.waitForAnomalyDetectionJobToExist(jobId);
      log.debug('> AD job created.');
    },

    async createAnomalyDetectionJobES(jobConfig: Job) {
      const jobId = jobConfig.job_id;
      log.debug(`Creating anomaly detection job with id '${jobId}' via ES API...`);

      const { body, status } = await esSupertest
        .put(`/_ml/anomaly_detectors/${jobId}`)
        .send(jobConfig);
      this.assertResponseStatusCode(200, status, body);

      await this.waitForAnomalyDetectionJobToExist(jobId);
      log.debug('> AD job created.');
    },

    async deleteAnomalyDetectionJobES(jobId: string) {
      log.debug(`Deleting anomaly detection job with id '${jobId}' ...`);

      if ((await this.adJobExist(jobId)) === false) {
        log.debug('> no such AD job found, nothing to delete.');
        return;
      }

      const datafeedId = `datafeed-${jobId}`;
      if ((await this.datafeedExist(datafeedId)) === true) {
        await this.deleteDatafeedES(datafeedId);
      }

      const { body, status } = await esSupertest
        .delete(`/_ml/anomaly_detectors/${jobId}`)
        .query({ force: true });
      this.assertResponseStatusCode(200, status, body);

      await this.waitForAnomalyDetectionJobNotToExist(jobId);
      log.debug('> AD job deleted.');
    },

    async getDatafeed(datafeedId: string) {
      const response = await esSupertest.get(`/_ml/datafeeds/${datafeedId}`);
      this.assertResponseStatusCode(200, response.status, response.body);
      return response;
    },

    async datafeedExist(datafeedId: string) {
      try {
        await this.getDatafeed(datafeedId);
        return true;
      } catch (err) {
        return false;
      }
    },

    async waitForDatafeedToExist(datafeedId: string) {
      await retry.waitForWithTimeout(`'${datafeedId}' to exist`, 5 * 1000, async () => {
        if ((await this.datafeedExist(datafeedId)) === true) {
          return true;
        } else {
          throw new Error(`expected datafeed '${datafeedId}' to exist`);
        }
      });
    },

    async waitForDatafeedToNotExist(datafeedId: string) {
      await retry.waitForWithTimeout(`'${datafeedId}' to not exist`, 5 * 1000, async () => {
        if ((await this.datafeedExist(datafeedId)) === false) {
          return true;
        } else {
          throw new Error(`expected datafeed '${datafeedId}' not to exist`);
        }
      });
    },

    async createDatafeed(datafeedConfig: Datafeed, space?: string) {
      const datafeedId = datafeedConfig.datafeed_id;
      log.debug(
        `Creating datafeed with id '${datafeedId}' ${space ? `in space '${space}' ` : ''}...`
      );
      const { body, status } = await kbnSupertest
        .put(`${space ? `/s/${space}` : ''}/api/ml/datafeeds/${datafeedId}`)
        .set(COMMON_REQUEST_HEADERS)
        .send(datafeedConfig);
      this.assertResponseStatusCode(200, status, body);

      await this.waitForDatafeedToExist(datafeedId);
      log.debug('> Datafeed created.');
    },

    async createDatafeedES(datafeedConfig: Datafeed) {
      const datafeedId = datafeedConfig.datafeed_id;
      log.debug(`Creating datafeed with id '${datafeedId}' via ES API ...`);
      const { body, status } = await esSupertest
        .put(`/_ml/datafeeds/${datafeedId}`)
        .send(datafeedConfig);
      this.assertResponseStatusCode(200, status, body);

      await this.waitForDatafeedToExist(datafeedId);
      log.debug('> Datafeed created.');
    },

    async deleteDatafeedES(datafeedId: string) {
      log.debug(`Deleting datafeed with id '${datafeedId}' ...`);
      const { body, status } = await esSupertest
        .delete(`/_ml/datafeeds/${datafeedId}`)
        .query({ force: true });
      this.assertResponseStatusCode(200, status, body);

      await this.waitForDatafeedToNotExist(datafeedId);
      log.debug('> Datafeed deleted.');
    },

    async openAnomalyDetectionJob(jobId: string) {
      log.debug(`Opening anomaly detection job '${jobId}'...`);
      const { body: openResponse, status } = await esSupertest
        .post(`/_ml/anomaly_detectors/${jobId}/_open`)
        .send({ timeout: '10s' })
        .set({ 'Content-Type': 'application/json' });
      this.assertResponseStatusCode(200, status, openResponse);

      expect(openResponse)
        .to.have.property('opened')
        .eql(true, 'Response for open job request should be acknowledged');
      log.debug('> AD job opened.');
    },

    async closeAnomalyDetectionJob(jobId: string) {
      log.debug(`Closing anomaly detection job '${jobId}'...`);
      const { body: closeResponse, status } = await esSupertest
        .post(`/_ml/anomaly_detectors/${jobId}/_close`)
        .send({ timeout: '10s' })
        .set({ 'Content-Type': 'application/json' });
      this.assertResponseStatusCode(200, status, closeResponse);

      expect(closeResponse)
        .to.have.property('closed')
        .eql(true, 'Job closing should be acknowledged');
      log.debug('> AD job closed.');
    },

    async startDatafeed(
      datafeedId: string,
      startConfig: { start?: string; end?: string } = { start: '0' }
    ) {
      log.debug(
        `Starting datafeed '${datafeedId}' with start: '${startConfig.start}', end: '${startConfig.end}'...`
      );
      const { body: startResponse, status } = await esSupertest
        .post(`/_ml/datafeeds/${datafeedId}/_start`)
        .send(startConfig)
        .set({ 'Content-Type': 'application/json' });
      this.assertResponseStatusCode(200, status, startResponse);

      expect(startResponse)
        .to.have.property('started')
        .eql(true, 'Response for start datafeed request should be acknowledged');
      log.debug('> Datafeed started.');
    },

    async stopDatafeed(datafeedId: string) {
      log.debug(`Stopping datafeed '${datafeedId}'...`);
      const { body: stopResponse, status } = await esSupertest
        .post(`/_ml/datafeeds/${datafeedId}/_stop`)
        .set({ 'Content-Type': 'application/json' });
      this.assertResponseStatusCode(200, status, stopResponse);

      expect(stopResponse)
        .to.have.property('stopped')
        .eql(true, 'Response for stop datafeed request should be acknowledged');
      log.debug('> Datafeed stopped.');
    },

    async createAndRunAnomalyDetectionLookbackJob(
      jobConfig: Job,
      datafeedConfig: Datafeed,
      space?: string
    ) {
      await this.createAnomalyDetectionJob(jobConfig, space);
      await this.createDatafeed(datafeedConfig, space);
      await this.openAnomalyDetectionJob(jobConfig.job_id);
      await this.startDatafeed(datafeedConfig.datafeed_id, { start: '0', end: `${Date.now()}` });
      await this.waitForDatafeedState(datafeedConfig.datafeed_id, DATAFEED_STATE.STOPPED);
      await this.waitForJobState(jobConfig.job_id, JOB_STATE.CLOSED);
    },

    async getDataFrameAnalyticsJob(analyticsId: string, statusCode = 200) {
      log.debug(`Fetching data frame analytics job '${analyticsId}'...`);
      const response = await esSupertest.get(`/_ml/data_frame/analytics/${analyticsId}`);
      this.assertResponseStatusCode(statusCode, response.status, response.body);

      log.debug('> DFA job fetched.');
      return response;
    },

    async dfaJobExist(analyticsId: string) {
      this.validateJobId(analyticsId);
      try {
        await this.getDataFrameAnalyticsJob(analyticsId);
        return true;
      } catch (err) {
        return false;
      }
    },

    async waitForDataFrameAnalyticsJobToExist(analyticsId: string) {
      await retry.waitForWithTimeout(`'${analyticsId}' to exist`, 5 * 1000, async () => {
        if (await this.getDataFrameAnalyticsJob(analyticsId)) {
          return true;
        } else {
          throw new Error(`expected data frame analytics job '${analyticsId}' to exist`);
        }
      });
    },

    async waitForDataFrameAnalyticsJobNotToExist(analyticsId: string) {
      await retry.waitForWithTimeout(`'${analyticsId}' not to exist`, 5 * 1000, async () => {
        if (await this.getDataFrameAnalyticsJob(analyticsId, 404)) {
          return true;
        } else {
          throw new Error(`expected data frame analytics job '${analyticsId}' not to exist`);
        }
      });
    },

    async createDataFrameAnalyticsJob(jobConfig: DataFrameAnalyticsConfig, space?: string) {
      const { id: analyticsId, ...analyticsConfig } = jobConfig;
      log.debug(
        `Creating data frame analytic job with id '${analyticsId}' ${
          space ? `in space '${space}' ` : ''
        }...`
      );
      const { body, status } = await kbnSupertest
        .put(`${space ? `/s/${space}` : ''}/api/ml/data_frame/analytics/${analyticsId}`)
        .set(COMMON_REQUEST_HEADERS)
        .send(analyticsConfig);
      this.assertResponseStatusCode(200, status, body);

      await this.waitForDataFrameAnalyticsJobToExist(analyticsId);
      log.debug('> DFA job created.');
    },

    async createDataFrameAnalyticsJobES(jobConfig: DataFrameAnalyticsConfig) {
      const { id: analyticsId, ...analyticsConfig } = jobConfig;
      log.debug(`Creating data frame analytic job with id '${analyticsId}' via ES API...`);
      const { body, status } = await esSupertest
        .put(`/_ml/data_frame/analytics/${analyticsId}`)
        .set(COMMON_REQUEST_HEADERS)
        .send(analyticsConfig);
      this.assertResponseStatusCode(200, status, body);

      await this.waitForDataFrameAnalyticsJobToExist(analyticsId);
      log.debug('> DFA job created.');
    },

    async deleteDataFrameAnalyticsJobES(analyticsId: string) {
      log.debug(`Deleting data frame analytics job with id '${analyticsId}' ...`);

      if ((await this.dfaJobExist(analyticsId)) === false) {
        log.debug('> no such DFA job found, nothing to delete.');
        return;
      }

      const { body, status } = await esSupertest
        .delete(`/_ml/data_frame/analytics/${analyticsId}`)
        .query({ force: true });
      this.assertResponseStatusCode(200, status, body);

      await this.waitForDataFrameAnalyticsJobNotToExist(analyticsId);
      log.debug('> DFA job deleted.');
    },

    async getADJobRecordCount(jobId: string): Promise<number> {
      const jobStats = await this.getADJobStats(jobId);

      expect(jobStats.jobs).to.have.length(
        1,
        `Expected job stats to have exactly one job (got '${jobStats.jobs.length}')`
      );
      const processedRecordCount: number = jobStats.jobs[0].data_counts.processed_record_count;

      return processedRecordCount;
    },

    async waitForADJobRecordCountToBePositive(jobId: string) {
      await retry.waitForWithTimeout(
        `'${jobId}' to have processed_record_count > 0`,
        10 * 1000,
        async () => {
          const processedRecordCount = await this.getADJobRecordCount(jobId);
          if (processedRecordCount > 0) {
            return true;
          } else {
            throw new Error(
              `expected anomaly detection job '${jobId}' to have processed_record_count > 0 (got ${processedRecordCount})`
            );
          }
        }
      );
    },

    async getFilter(filterId: string, expectedCode = 200) {
      const response = await esSupertest.get(`/_ml/filters/${filterId}`);
      this.assertResponseStatusCode(expectedCode, response.status, response.body);
      return response;
    },

    async createFilter(filterId: string, requestBody: object) {
      log.debug(`Creating filter with id '${filterId}'...`);
      const { body, status } = await esSupertest.put(`/_ml/filters/${filterId}`).send(requestBody);
      this.assertResponseStatusCode(200, status, body);

      await this.waitForFilterToExist(filterId, `expected filter '${filterId}' to be created`);
      log.debug('> Filter created.');
    },

    async deleteFilter(filterId: string) {
      log.debug(`Deleting filter with id '${filterId}'...`);
      await esSupertest.delete(`/_ml/filters/${filterId}`);

      await this.waitForFilterToNotExist(filterId, `expected filter '${filterId}' to be deleted`);
      log.debug('> Filter deleted.');
    },

    async waitForFilterToExist(filterId: string, errorMsg?: string) {
      await retry.waitForWithTimeout(`'${filterId}' to exist`, 5 * 1000, async () => {
        if (await this.getFilter(filterId, 200)) {
          return true;
        } else {
          throw new Error(errorMsg || `expected filter '${filterId}' to exist`);
        }
      });
    },

    async waitForFilterToNotExist(filterId: string, errorMsg?: string) {
      await retry.waitForWithTimeout(`'${filterId}' to not exist`, 5 * 1000, async () => {
        if (await this.getFilter(filterId, 404)) {
          return true;
        } else {
          throw new Error(errorMsg || `expected filter '${filterId}' to not exist`);
        }
      });
    },

    async getAnnotations(jobId: string) {
      log.debug(`Fetching annotations for job '${jobId}'...`);

      const body = await es.search<Annotation>({
        index: ML_ANNOTATIONS_INDEX_ALIAS_READ,
        body: {
          query: {
            match: {
              job_id: jobId,
            },
          },
        },
      });
      expect(body).to.not.be(undefined);
      expect(body).to.have.property('hits');
      log.debug('> Annotations fetched.');
      return body.hits.hits;
    },

    async getAnnotationById(annotationId: string): Promise<Annotation | undefined> {
      log.debug(`Fetching annotation '${annotationId}'...`);

      const body = await es.search({
        index: ML_ANNOTATIONS_INDEX_ALIAS_READ,
        body: {
          size: 1,
          query: {
            match: {
              _id: annotationId,
            },
          },
        },
      });
      log.debug('> Annotation fetched.');

      // @ts-expect-error doesn't handle total as number
      if (body.hits.total.value === 1) {
        return body?.hits?.hits[0]?._source as Annotation;
      }
      return undefined;
    },

    async indexAnnotation(annotationRequestBody: Partial<Annotation>, id?: string) {
      log.debug(`Indexing annotation '${JSON.stringify(annotationRequestBody)}'...`);
      // @ts-ignore due to outdated type for IndexDocumentParams.type
      const params = {
        index: ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
        id,
        body: annotationRequestBody,
        refresh: 'wait_for',
      } as const;
      const body = await es.index(params);
      await this.waitForAnnotationToExist(body._id);
      log.debug(`> Annotation ${body._id} indexed.`);
      return body;
    },

    async waitForAnnotationToExist(annotationId: string, errorMsg?: string) {
      await retry.tryForTime(30 * 1000, async () => {
        if ((await this.getAnnotationById(annotationId)) !== undefined) {
          return true;
        } else {
          throw new Error(errorMsg ?? `annotation '${annotationId}' should exist`);
        }
      });
    },

    async waitForAnnotationNotToExist(annotationId: string, errorMsg?: string) {
      await retry.tryForTime(30 * 1000, async () => {
        if ((await this.getAnnotationById(annotationId)) === undefined) {
          return true;
        } else {
          throw new Error(errorMsg ?? `annotation '${annotationId}' should not exist`);
        }
      });
    },

    async runDFAJob(dfaId: string) {
      log.debug(`Starting data frame analytics job '${dfaId}'...`);
      const { body: startResponse, status } = await esSupertest
        .post(`/_ml/data_frame/analytics/${dfaId}/_start`)
        .set({ 'Content-Type': 'application/json' });
      this.assertResponseStatusCode(200, status, startResponse);

      expect(startResponse)
        .to.have.property('acknowledged')
        .eql(true, 'Response for start data frame analytics job request should be acknowledged');
      log.debug('> DFA job started.');
    },

    async createAndRunDFAJob(dfaConfig: DataFrameAnalyticsConfig, timeout?: number) {
      await this.createDataFrameAnalyticsJob(dfaConfig);
      await this.runDFAJob(dfaConfig.id);
      await this.waitForDFAJobTrainingRecordCountToBePositive(dfaConfig.id);
      await this.waitForAnalyticsState(dfaConfig.id, DATA_FRAME_TASK_STATE.STOPPED, timeout);
    },

    async updateJobSpaces(
      jobId: string,
      jobType: JobType,
      spacesToAdd: string[],
      spacesToRemove: string[],
      space?: string
    ) {
      const { body, status } = await kbnSupertest
        .post(`${space ? `/s/${space}` : ''}/api/ml/saved_objects/update_jobs_spaces`)
        .set(COMMON_REQUEST_HEADERS)
        .send({ jobType, jobIds: [jobId], spacesToAdd, spacesToRemove });
      this.assertResponseStatusCode(200, status, body);

      expect(body).to.eql({ [jobId]: { success: true } });
    },

    async assertJobSpaces(jobId: string, jobType: JobType, expectedSpaces: string[]) {
      const { body, status } = await kbnSupertest
        .get('/api/ml/saved_objects/jobs_spaces')
        .set(COMMON_REQUEST_HEADERS);
      this.assertResponseStatusCode(200, status, body);

      if (expectedSpaces.length > 0) {
        // Should list expected spaces correctly
        expect(body).to.have.property(jobType);
        expect(body[jobType]).to.have.property(jobId);
        expect(body[jobType][jobId]).to.eql(expectedSpaces);
      } else {
        // The job is expected to be not connected to any space. So either the jobType
        // section should be missing or if it exists, it should not show the jobId
        if (jobType in body) {
          expect(body[jobType]).to.not.have.property(jobId);
        }
      }
    },

    async createTrainedModel(modelId: string, body: PutTrainedModelConfig) {
      log.debug(`Creating trained model with id "${modelId}"`);
      const { body: model, status } = await esSupertest
        .put(`/_ml/trained_models/${modelId}`)
        .send(body);
      this.assertResponseStatusCode(200, status, model);

      log.debug('> Trained model created');
      return model;
    },

    async createTestTrainedModels(
      modelType: ModelType,
      count: number = 10,
      withIngestPipelines = false
    ) {
      const compressedDefinition = this.getCompressedModelDefinition(modelType);

      const modelIds = new Array(count).fill(null).map((v, i) => `dfa_${modelType}_model_n_${i}`);

      const models = modelIds.map((id) => {
        return {
          model_id: id,
          body: {
            compressed_definition: compressedDefinition,
            inference_config: {
              [modelType]: {},
            },
            input: {
              field_names: ['common_field'],
            },
          } as PutTrainedModelConfig,
        };
      });

      for (const model of models) {
        await this.createTrainedModel(model.model_id, model.body);
        if (withIngestPipelines) {
          await this.createIngestPipeline(model.model_id);
        }
      }

      return modelIds;
    },

    /**
     * Retrieves compressed model definition from the test resources.
     * @param modelType
     */
    getCompressedModelDefinition(modelType: ModelType) {
      return fs.readFileSync(
        path.resolve(
          __dirname,
          'resources',
          'trained_model_definitions',
          `minimum_valid_config_${modelType}.json.gz.b64`
        ),
        'utf-8'
      );
    },

    async createModelAlias(modelId: string, modelAlias: string) {
      log.debug(`Creating alias for model "${modelId}"`);
      const { body, status } = await esSupertest.put(
        `/_ml/trained_models/${modelId}/model_aliases/${modelAlias}`
      );
      this.assertResponseStatusCode(200, status, body);

      log.debug('> Model alias created');
    },

    /**
     * Creates ingest pipelines for trained model
     * @param modelId
     */
    async createIngestPipeline(modelId: string) {
      log.debug(`Creating ingest pipeline for trained model with id "${modelId}"`);
      const { body: ingestPipeline, status } = await esSupertest
        .put(`/_ingest/pipeline/pipeline_${modelId}`)
        .send({
          processors: [
            {
              inference: {
                model_id: modelId,
              },
            },
          ],
        });
      this.assertResponseStatusCode(200, status, ingestPipeline);

      log.debug('> Ingest pipeline crated');
      return ingestPipeline;
    },

    async deleteIngestPipeline(modelId: string) {
      log.debug(`Deleting ingest pipeline for trained model with id "${modelId}"`);
      const { body, status } = await esSupertest.delete(`/_ingest/pipeline/pipeline_${modelId}`);
      this.assertResponseStatusCode(200, status, body);

      log.debug('> Ingest pipeline deleted');
    },
  };
}

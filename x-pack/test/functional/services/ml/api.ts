/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test/types/ftr';
import { IndexDocumentParams } from 'elasticsearch';
import { Calendar, CalendarEvent } from '../../../../plugins/ml/server/models/calendar/index';
import { Annotation } from '../../../../plugins/ml/common/types/annotations';
import { DataFrameAnalyticsConfig } from '../../../../plugins/ml/public/application/data_frame_analytics/common';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATAFEED_STATE, JOB_STATE } from '../../../../plugins/ml/common/constants/states';
import { DATA_FRAME_TASK_STATE } from '../../../../plugins/ml/public/application/data_frame_analytics/pages/analytics_management/components/analytics_list/data_frame_task_state';
import { Datafeed, Job } from '../../../../plugins/ml/common/types/anomaly_detection_jobs';
import { JobType } from '../../../../plugins/ml/common/types/saved_objects';
export type MlApi = ProvidedType<typeof MachineLearningAPIProvider>;
import {
  ML_ANNOTATIONS_INDEX_ALIAS_READ,
  ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
} from '../../../../plugins/ml/common/constants/index_patterns';
import { COMMON_REQUEST_HEADERS } from '../../../functional/services/ml/common_api';

interface EsIndexResult {
  _index: string;
  _id: string;
  _version: number;
  result: string;
  _shards: any;
  _seq_no: number;
  _primary_term: number;
}

export function MachineLearningAPIProvider({ getService }: FtrProviderContext) {
  const es = getService('legacyEs');
  const log = getService('log');
  const retry = getService('retry');
  const esSupertest = getService('esSupertest');
  const kbnSupertest = getService('supertest');

  return {
    async hasJobResults(jobId: string): Promise<boolean> {
      const response = await es.search({
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

      return response.hits.hits.length > 0;
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
      const response = await es.search({
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

      return response.hits.hits.length > 0;
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

    async createIndices(indices: string) {
      log.debug(`Creating indices: '${indices}'...`);
      if ((await es.indices.exists({ index: indices, allowNoIndices: false })) === true) {
        log.debug(`Indices '${indices}' already exist. Nothing to create.`);
        return;
      }

      const createResponse = await es.indices.create({ index: indices });
      expect(createResponse)
        .to.have.property('acknowledged')
        .eql(true, 'Response for create request indices should be acknowledged.');

      await this.assertIndicesExist(indices);
      log.debug('> Indices created.');
    },

    async deleteIndices(indices: string) {
      log.debug(`Deleting indices: '${indices}'...`);
      if ((await es.indices.exists({ index: indices, allowNoIndices: false })) === false) {
        log.debug(`Indices '${indices}' don't exist. Nothing to delete.`);
        return;
      }

      const deleteResponse = await es.indices.delete({
        index: indices,
      });
      expect(deleteResponse)
        .to.have.property('acknowledged')
        .eql(true, 'Response for delete request should be acknowledged.');

      await this.assertIndicesNotToExist(indices);
      log.debug('> Indices deleted.');
    },

    async cleanMlIndices() {
      await this.deleteIndices('.ml-*');
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
      const jobStats = await esSupertest
        .get(`/_ml/anomaly_detectors/${jobId}/_stats`)
        .expect(200)
        .then((res: any) => res.body);

      log.debug('> AD job stats fetched.');
      return jobStats;
    },

    async waitForJobState(jobId: string, expectedJobState: JOB_STATE) {
      await retry.waitForWithTimeout(
        `job state to be ${expectedJobState}`,
        2 * 60 * 1000,
        async () => {
          const state = await this.getJobState(jobId);
          if (state === expectedJobState) {
            return true;
          } else {
            throw new Error(`expected job state to be ${expectedJobState} but got ${state}`);
          }
        }
      );
    },

    async getDatafeedState(datafeedId: string): Promise<DATAFEED_STATE> {
      log.debug(`Fetching datafeed state for datafeed ${datafeedId}`);
      const datafeedStats = await esSupertest
        .get(`/_ml/datafeeds/${datafeedId}/_stats`)
        .expect(200)
        .then((res: any) => res.body);

      expect(datafeedStats.datafeeds).to.have.length(
        1,
        `Expected datafeed stats to have exactly one datafeed (got '${datafeedStats.datafeeds.length}')`
      );
      const state: DATAFEED_STATE = datafeedStats.datafeeds[0].state;

      return state;
    },

    async waitForDatafeedState(datafeedId: string, expectedDatafeedState: DATAFEED_STATE) {
      await retry.waitForWithTimeout(
        `datafeed state to be ${expectedDatafeedState}`,
        2 * 60 * 1000,
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
      const analyticsStats = await esSupertest
        .get(`/_ml/data_frame/analytics/${analyticsId}/_stats`)
        .expect(200)
        .then((res: any) => res.body);

      log.debug('> DFA job stats fetched.');
      return analyticsStats;
    },

    async getAnalyticsState(analyticsId: string): Promise<DATA_FRAME_TASK_STATE> {
      log.debug(`Fetching analytics state for job ${analyticsId}`);
      const analyticsStats = await this.getDFAJobStats(analyticsId);

      expect(analyticsStats.data_frame_analytics).to.have.length(
        1,
        `Expected dataframe analytics stats to have exactly one object (got '${analyticsStats.data_frame_analytics.length}')`
      );

      const state: DATA_FRAME_TASK_STATE = analyticsStats.data_frame_analytics[0].state;

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
      expectedAnalyticsState: DATA_FRAME_TASK_STATE
    ) {
      await retry.waitForWithTimeout(
        `analytics state to be ${expectedAnalyticsState}`,
        2 * 60 * 1000,
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
        if ((await es.indices.exists({ index: indices, allowNoIndices: false })) === true) {
          return true;
        } else {
          throw new Error(`indices '${indices}' should exist`);
        }
      });
    },

    async assertIndicesNotToExist(indices: string) {
      await retry.tryForTime(30 * 1000, async () => {
        if ((await es.indices.exists({ index: indices, allowNoIndices: false })) === false) {
          return true;
        } else {
          throw new Error(`indices '${indices}' should not exist`);
        }
      });
    },

    async assertIndicesNotEmpty(indices: string) {
      await retry.tryForTime(30 * 1000, async () => {
        const response = await es.search({
          index: indices,
          body: {
            size: 1,
          },
        });

        if (response.hits.hits.length > 0) {
          return true;
        } else {
          throw new Error(`indices '${indices}' should not be empty`);
        }
      });
    },

    async getCalendar(calendarId: string, expectedCode = 200) {
      return await esSupertest.get(`/_ml/calendars/${calendarId}`).expect(expectedCode);
    },

    async createCalendar(
      calendarId: string,
      requestBody: Partial<Calendar> = { description: '', job_ids: [] }
    ) {
      log.debug(`Creating calendar with id '${calendarId}'...`);
      await esSupertest.put(`/_ml/calendars/${calendarId}`).send(requestBody).expect(200);
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

    async createCalendarEvents(calendarId: string, events: CalendarEvent[]) {
      log.debug(`Creating events for calendar with id '${calendarId}'...`);
      await esSupertest.post(`/_ml/calendars/${calendarId}/events`).send({ events }).expect(200);
      await this.waitForEventsToExistInCalendar(calendarId, events);
      log.debug('> Calendar events created.');
    },

    async getCalendarEvents(calendarId: string, expectedCode = 200) {
      return await esSupertest.get(`/_ml/calendars/${calendarId}/events`).expect(expectedCode);
    },

    assertAllEventsExistInCalendar: (
      eventsToCheck: CalendarEvent[],
      calendar: Calendar
    ): boolean => {
      const updatedCalendarEvents = calendar.events as CalendarEvent[];
      let allEventsAreUpdated = true;
      for (const eventToCheck of eventsToCheck) {
        // if at least one of the events that we need to check is not in the updated events
        // no need to continue
        if (
          updatedCalendarEvents.findIndex(
            (updatedEvent) =>
              updatedEvent.description === eventToCheck.description &&
              updatedEvent.start_time === eventToCheck.start_time &&
              updatedEvent.end_time === eventToCheck.end_time
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
      eventsToCheck: CalendarEvent[],
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

    async getAnomalyDetectionJob(jobId: string) {
      return await esSupertest.get(`/_ml/anomaly_detectors/${jobId}`).expect(200);
    },

    async waitForAnomalyDetectionJobToExist(jobId: string) {
      await retry.waitForWithTimeout(`'${jobId}' to exist`, 5 * 1000, async () => {
        if (await this.getAnomalyDetectionJob(jobId)) {
          return true;
        } else {
          throw new Error(`expected anomaly detection job '${jobId}' to exist`);
        }
      });
    },

    async waitForAnomalyDetectionJobNotToExist(jobId: string) {
      await retry.waitForWithTimeout(`'${jobId}' to not exist`, 5 * 1000, async () => {
        if (await esSupertest.get(`/_ml/anomaly_detectors/${jobId}`).expect(404)) {
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

      await kbnSupertest
        .put(`${space ? `/s/${space}` : ''}/api/ml/anomaly_detectors/${jobId}`)
        .set(COMMON_REQUEST_HEADERS)
        .send(jobConfig)
        .expect(200);

      await this.waitForAnomalyDetectionJobToExist(jobId);
      log.debug('> AD job created.');
    },

    async createAnomalyDetectionJobES(jobConfig: Job) {
      const jobId = jobConfig.job_id;
      log.debug(`Creating anomaly detection job with id '${jobId}' via ES API...`);

      await esSupertest.put(`/_ml/anomaly_detectors/${jobId}`).send(jobConfig).expect(200);

      await this.waitForAnomalyDetectionJobToExist(jobId);
      log.debug('> AD job created.');
    },

    async deleteAnomalyDetectionJobES(jobId: string) {
      log.debug(`Deleting anomaly detection job with id '${jobId}' ...`);

      const datafeedId = `datafeed-${jobId}`;
      if ((await this.datafeedExist(datafeedId)) === true) {
        await this.deleteDatafeedES(datafeedId);
      }

      await esSupertest
        .delete(`/_ml/anomaly_detectors/${jobId}`)
        .query({ force: true })
        .expect(200);

      await this.waitForAnomalyDetectionJobNotToExist(jobId);
      log.debug('> AD job deleted.');
    },

    async getDatafeed(datafeedId: string) {
      return await esSupertest.get(`/_ml/datafeeds/${datafeedId}`).expect(200);
      // return await kbnSupertest.get(`/api/ml/datafeeds/${datafeedId}`).expect(200);
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
      await retry.waitForWithTimeout(`'${datafeedId}' to exist`, 5 * 1000, async () => {
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
      await kbnSupertest
        .put(`${space ? `/s/${space}` : ''}/api/ml/datafeeds/${datafeedId}`)
        .set(COMMON_REQUEST_HEADERS)
        .send(datafeedConfig)
        .expect(200);

      await this.waitForDatafeedToExist(datafeedId);
      log.debug('> Datafeed created.');
    },

    async createDatafeedES(datafeedConfig: Datafeed) {
      const datafeedId = datafeedConfig.datafeed_id;
      log.debug(`Creating datafeed with id '${datafeedId}' via ES API ...`);
      await esSupertest.put(`/_ml/datafeeds/${datafeedId}`).send(datafeedConfig).expect(200);

      await this.waitForDatafeedToExist(datafeedId);
      log.debug('> Datafeed created.');
    },

    async deleteDatafeedES(datafeedId: string) {
      log.debug(`Deleting datafeed with id '${datafeedId}' ...`);
      await esSupertest.delete(`/_ml/datafeeds/${datafeedId}`).query({ force: true }).expect(200);

      await this.waitForDatafeedToNotExist(datafeedId);
      log.debug('> Datafeed deleted.');
    },

    async openAnomalyDetectionJob(jobId: string) {
      log.debug(`Opening anomaly detection job '${jobId}'...`);
      const openResponse = await esSupertest
        .post(`/_ml/anomaly_detectors/${jobId}/_open`)
        .send({ timeout: '10s' })
        .set({ 'Content-Type': 'application/json' })
        .expect(200)
        .then((res: any) => res.body);

      expect(openResponse)
        .to.have.property('opened')
        .eql(true, 'Response for open job request should be acknowledged');
      log.debug('> AD job opened.');
    },

    async closeAnomalyDetectionJob(jobId: string) {
      log.debug(`Closing anomaly detection job '${jobId}'...`);
      const closeResponse = await esSupertest
        .post(`/_ml/anomaly_detectors/${jobId}/_close`)
        .send({ timeout: '10s' })
        .set({ 'Content-Type': 'application/json' })
        .expect(200)
        .then((res: any) => res.body);

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
      const startResponse = await esSupertest
        .post(`/_ml/datafeeds/${datafeedId}/_start`)
        .send(startConfig)
        .set({ 'Content-Type': 'application/json' })
        .expect(200)
        .then((res: any) => res.body);

      expect(startResponse)
        .to.have.property('started')
        .eql(true, 'Response for start datafeed request should be acknowledged');
      log.debug('> Datafeed started.');
    },

    async stopDatafeed(datafeedId: string) {
      log.debug(`Stopping datafeed '${datafeedId}'...`);
      const stopResponse = await esSupertest
        .post(`/_ml/datafeeds/${datafeedId}/_stop`)
        .set({ 'Content-Type': 'application/json' })
        .expect(200)
        .then((res: any) => res.body);

      expect(stopResponse)
        .to.have.property('stopped')
        .eql(true, 'Response for stop datafeed request should be acknowledged');
      log.debug('> Datafeed stopped.');
    },

    async createAndRunAnomalyDetectionLookbackJob(jobConfig: Job, datafeedConfig: Datafeed) {
      await this.createAnomalyDetectionJob(jobConfig);
      await this.createDatafeed(datafeedConfig);
      await this.openAnomalyDetectionJob(jobConfig.job_id);
      await this.startDatafeed(datafeedConfig.datafeed_id, { start: '0', end: `${Date.now()}` });
      await this.waitForDatafeedState(datafeedConfig.datafeed_id, DATAFEED_STATE.STOPPED);
      await this.waitForJobState(jobConfig.job_id, JOB_STATE.CLOSED);
    },

    async getDataFrameAnalyticsJob(analyticsId: string, statusCode = 200) {
      log.debug(`Fetching data frame analytics job '${analyticsId}'...`);
      const response = await esSupertest
        .get(`/_ml/data_frame/analytics/${analyticsId}`)
        .expect(statusCode);
      log.debug('> DFA job fetched.');
      return response;
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
      await kbnSupertest
        .put(`${space ? `/s/${space}` : ''}/api/ml/data_frame/analytics/${analyticsId}`)
        .set(COMMON_REQUEST_HEADERS)
        .send(analyticsConfig)
        .expect(200);

      await this.waitForDataFrameAnalyticsJobToExist(analyticsId);
      log.debug('> DFA job created.');
    },

    async createDataFrameAnalyticsJobES(jobConfig: DataFrameAnalyticsConfig) {
      const { id: analyticsId, ...analyticsConfig } = jobConfig;
      log.debug(`Creating data frame analytic job with id '${analyticsId}' via ES API...`);
      await esSupertest
        .put(`/_ml/data_frame/analytics/${analyticsId}`)
        .set(COMMON_REQUEST_HEADERS)
        .send(analyticsConfig)
        .expect(200);

      await this.waitForDataFrameAnalyticsJobToExist(analyticsId);
      log.debug('> DFA job created.');
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
      return await esSupertest.get(`/_ml/filters/${filterId}`).expect(expectedCode);
    },

    async createFilter(filterId: string, requestBody: object) {
      log.debug(`Creating filter with id '${filterId}'...`);
      await esSupertest.put(`/_ml/filters/${filterId}`).send(requestBody).expect(200);

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

      const results = await es.search<Annotation>({
        index: ML_ANNOTATIONS_INDEX_ALIAS_READ,
        body: {
          query: {
            match: {
              job_id: jobId,
            },
          },
        },
      });
      expect(results).to.not.be(undefined);
      expect(results).to.have.property('hits');
      log.debug('> Annotations fetched.');
      return results.hits.hits;
    },

    async getAnnotationById(annotationId: string): Promise<Annotation | undefined> {
      log.debug(`Fetching annotation '${annotationId}'...`);

      const result = await es.search({
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
      // @ts-ignore due to outdated type for hits.total
      if (result.hits.total.value === 1) {
        return result?.hits?.hits[0]?._source as Annotation;
      }
      return undefined;
    },

    async indexAnnotation(annotationRequestBody: Partial<Annotation>) {
      log.debug(`Indexing annotation '${JSON.stringify(annotationRequestBody)}'...`);
      // @ts-ignore due to outdated type for IndexDocumentParams.type
      const params: IndexDocumentParams<Partial<Annotation>> = {
        index: ML_ANNOTATIONS_INDEX_ALIAS_WRITE,
        body: annotationRequestBody,
        refresh: 'wait_for',
      };
      const results: EsIndexResult = await es.index(params);
      await this.waitForAnnotationToExist(results._id);
      log.debug('> Annotation indexed.');
      return results;
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
      const startResponse = await esSupertest
        .post(`/_ml/data_frame/analytics/${dfaId}/_start`)
        .set({ 'Content-Type': 'application/json' })
        .expect(200)
        .then((res: any) => res.body);

      expect(startResponse)
        .to.have.property('acknowledged')
        .eql(true, 'Response for start data frame analytics job request should be acknowledged');
      log.debug('> DFA job started.');
    },

    async createAndRunDFAJob(dfaConfig: DataFrameAnalyticsConfig) {
      await this.createDataFrameAnalyticsJob(dfaConfig);
      await this.runDFAJob(dfaConfig.id);
      await this.waitForDFAJobTrainingRecordCountToBePositive(dfaConfig.id);
      await this.waitForAnalyticsState(dfaConfig.id, DATA_FRAME_TASK_STATE.STOPPED);
    },

    async asignJobToSpaces(jobId: string, jobType: JobType, spacesToAdd: string[], space?: string) {
      const { body } = await kbnSupertest
        .post(`${space ? `/s/${space}` : ''}/api/ml/saved_objects/assign_job_to_space`)
        .set(COMMON_REQUEST_HEADERS)
        .send({ jobType, jobIds: [jobId], spaces: spacesToAdd })
        .expect(200);

      expect(body).to.eql({ [jobId]: { success: true } });
    },

    async removeJobFromSpaces(
      jobId: string,
      jobType: JobType,
      spacesToRemove: string[],
      space?: string
    ) {
      const { body } = await kbnSupertest
        .post(`${space ? `/s/${space}` : ''}/api/ml/saved_objects/remove_job_from_space`)
        .set(COMMON_REQUEST_HEADERS)
        .send({ jobType, jobIds: [jobId], spaces: spacesToRemove })
        .expect(200);

      expect(body).to.eql({ [jobId]: { success: true } });
    },

    async assertJobSpaces(jobId: string, jobType: JobType, expectedSpaces: string[]) {
      const { body } = await kbnSupertest
        .get('/api/ml/saved_objects/jobs_spaces')
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

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
  };
}

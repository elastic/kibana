/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test/types/ftr';
import { DataFrameAnalyticsConfig } from '../../../../plugins/ml/public/application/data_frame_analytics/common';

import { FtrProviderContext } from '../../ftr_provider_context';

import { DATAFEED_STATE, JOB_STATE } from '../../../../plugins/ml/common/constants/states';
import { DATA_FRAME_TASK_STATE } from '../../../../plugins/ml/public/application/data_frame_analytics/pages/analytics_management/components/analytics_list/common';
import { Datafeed, Job } from '../../../../plugins/ml/common/types/anomaly_detection_jobs';

export type MlApi = ProvidedType<typeof MachineLearningAPIProvider>;

export function MachineLearningAPIProvider({ getService }: FtrProviderContext) {
  const es = getService('legacyEs');
  const log = getService('log');
  const retry = getService('retry');
  const esSupertest = getService('esSupertest');

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
        10 * 1000,
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

    async getCalendar(calendarId: string) {
      return await esSupertest.get(`/_ml/calendars/${calendarId}`).expect(200);
    },

    async createCalendar(calendarId: string, body = { description: '', job_ids: [] }) {
      log.debug(`Creating calendar with id '${calendarId}'...`);
      await esSupertest.put(`/_ml/calendars/${calendarId}`).send(body).expect(200);

      await retry.waitForWithTimeout(`'${calendarId}' to be created`, 30 * 1000, async () => {
        if (await this.getCalendar(calendarId)) {
          return true;
        } else {
          throw new Error(`expected calendar '${calendarId}' to be created`);
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

    async createAnomalyDetectionJob(jobConfig: Job) {
      const jobId = jobConfig.job_id;
      log.debug(`Creating anomaly detection job with id '${jobId}'...`);
      await esSupertest.put(`/_ml/anomaly_detectors/${jobId}`).send(jobConfig).expect(200);

      await this.waitForAnomalyDetectionJobToExist(jobId);
    },

    async getDatafeed(datafeedId: string) {
      return await esSupertest.get(`/_ml/datafeeds/${datafeedId}`).expect(200);
    },

    async waitForDatafeedToExist(datafeedId: string) {
      await retry.waitForWithTimeout(`'${datafeedId}' to exist`, 5 * 1000, async () => {
        if (await this.getDatafeed(datafeedId)) {
          return true;
        } else {
          throw new Error(`expected datafeed '${datafeedId}' to exist`);
        }
      });
    },

    async createDatafeed(datafeedConfig: Datafeed) {
      const datafeedId = datafeedConfig.datafeed_id;
      log.debug(`Creating datafeed with id '${datafeedId}'...`);
      await esSupertest.put(`/_ml/datafeeds/${datafeedId}`).send(datafeedConfig).expect(200);

      await this.waitForDatafeedToExist(datafeedId);
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
      return await esSupertest.get(`/_ml/data_frame/analytics/${analyticsId}`).expect(statusCode);
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

    async createDataFrameAnalyticsJob(jobConfig: DataFrameAnalyticsConfig) {
      const { id: analyticsId, ...analyticsConfig } = jobConfig;
      log.debug(`Creating data frame analytic job with id '${analyticsId}'...`);
      await esSupertest
        .put(`/_ml/data_frame/analytics/${analyticsId}`)
        .send(analyticsConfig)
        .expect(200);

      await this.waitForDataFrameAnalyticsJobToExist(analyticsId);
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
  };
}

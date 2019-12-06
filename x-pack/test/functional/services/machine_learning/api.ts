/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

import { JOB_STATE, DATAFEED_STATE } from '../../../../legacy/plugins/ml/common/constants/states';
import { DATA_FRAME_TASK_STATE } from '../../../../legacy/plugins/ml/public/application/data_frame_analytics/pages/analytics_management/components/analytics_list/common';

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
        .eql(true, 'Response for delete request should be acknowledged');

      await retry.waitForWithTimeout(`'${indices}' indices to be deleted`, 30 * 1000, async () => {
        if ((await es.indices.exists({ index: indices, allowNoIndices: false })) === false) {
          return true;
        } else {
          throw new Error(`expected indices '${indices}' to be deleted`);
        }
      });
    },

    async cleanMlIndices() {
      await this.deleteIndices('.ml-*');
    },

    async getJobState(jobId: string): Promise<JOB_STATE> {
      log.debug(`Fetching job state for job ${jobId}`);
      const jobStats = await esSupertest
        .get(`/_ml/anomaly_detectors/${jobId}/_stats`)
        .expect(200)
        .then((res: any) => res.body);

      expect(jobStats.jobs).to.have.length(1);
      const state: JOB_STATE = jobStats.jobs[0].state;

      return state;
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

      expect(datafeedStats.datafeeds).to.have.length(1);
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

    async getAnalyticsState(analyticsId: string): Promise<DATA_FRAME_TASK_STATE> {
      log.debug(`Fetching analytics state for job ${analyticsId}`);
      const analyticsStats = await esSupertest
        .get(`/_ml/data_frame/analytics/${analyticsId}/_stats`)
        .expect(200)
        .then((res: any) => res.body);

      expect(analyticsStats.data_frame_analytics).to.have.length(1);
      const state: DATA_FRAME_TASK_STATE = analyticsStats.data_frame_analytics[0].state;

      return state;
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
      await esSupertest
        .put(`/_ml/calendars/${calendarId}`)
        .send(body)
        .expect(200);

      await retry.waitForWithTimeout(`'${calendarId}' to be created`, 30 * 1000, async () => {
        if (await this.getCalendar(calendarId)) {
          return true;
        } else {
          throw new Error(`expected calendar '${calendarId}' to be created`);
        }
      });
    },
  };
}

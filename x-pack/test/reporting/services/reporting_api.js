/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { indexTimestamp } from '../../../legacy/plugins/reporting/server/lib/esqueue/helpers/index_timestamp';

function removeWhitespace(str) {
  return str.replace(/\s/g, '');
}

export function ReportingAPIProvider({ getService }) {
  const log = getService('log');
  const supertest = getService('supertest');
  const esSupertest = getService('esSupertest');

  return {
    async waitForJobToFinish(downloadReportPath) {
      log.debug(`Waiting for job to finish: ${downloadReportPath}`);
      const JOB_IS_PENDING_CODE = 503;

      const statusCode = await new Promise(resolve => {
        const intervalId = setInterval(async () => {
          const response = await supertest
            .get(downloadReportPath)
            .responseType('blob')
            .set('kbn-xsrf', 'xxx');
          log.debug(`Report at path ${downloadReportPath} returned code ${response.statusCode}`);
          if (response.statusCode !== JOB_IS_PENDING_CODE) {
            clearInterval(intervalId);
            resolve(response.statusCode);
          }
        }, 1500);
      });

      expect(statusCode).to.be(200);
    },

    async expectAllJobsToFinishSuccessfully(jobPaths) {
      await Promise.all(
        jobPaths.map(async path => {
          await this.waitForJobToFinish(path);
        })
      );
    },

    async postJob(apiPath) {
      log.debug(`ReportingAPI.postJob(${apiPath})`);
      const { body } = await supertest
        .post(removeWhitespace(apiPath))
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      return body.path;
    },

    /**
     *
     * @return {Promise<Function>} A function to call to clean up the index alias that was added.
     */
    async coerceReportsIntoExistingIndex(indexName) {
      log.debug(`ReportingAPI.coerceReportsIntoExistingIndex(${indexName})`);

      // Adding an index alias coerces the report to be generated on an existing index which means any new
      // index schema won't be applied. This is important if a point release updated the schema. Reports may still
      // be inserted into an existing index before the new schema is applied.
      const timestampForIndex = indexTimestamp('week', '.');
      await esSupertest
        .post('/_aliases')
        .send({
          actions: [
            {
              add: { index: indexName, alias: `.reporting-${timestampForIndex}` },
            },
          ],
        })
        .expect(200);

      return async () => {
        await esSupertest
          .post('/_aliases')
          .send({
            actions: [
              {
                remove: { index: indexName, alias: `.reporting-${timestampForIndex}` },
              },
            ],
          })
          .expect(200);
      };
    },

    async deleteAllReportingIndexes() {
      log.debug('ReportingAPI.deleteAllReportingIndexes');
      await esSupertest.delete('/.reporting*').expect(200);
    },

    expectRecentPdfAppStats(stats, app, count) {
      expect(stats.reporting.last_day.printable_pdf.app[app]).to.be(count);
      expect(stats.reporting.last_7_days.printable_pdf.app[app]).to.be(count);
    },

    expectAllTimePdfAppStats(stats, app, count) {
      expect(stats.reporting.printable_pdf.app[app]).to.be(count);
    },

    expectRecentPdfLayoutStats(stats, layout, count) {
      expect(stats.reporting.last_day.printable_pdf.layout[layout]).to.be(count);
      expect(stats.reporting.last_7_days.printable_pdf.layout[layout]).to.be(count);
    },

    expectAllTimePdfLayoutStats(stats, layout, count) {
      expect(stats.reporting.printable_pdf.layout[layout]).to.be(count);
    },

    expectRecentJobTypeTotalStats(stats, jobType, count) {
      expect(stats.reporting.last_day[jobType].total).to.be(count);
      expect(stats.reporting.last_7_days[jobType].total).to.be(count);
    },

    expectAllTimeJobTypeTotalStats(stats, jobType, count) {
      expect(stats.reporting[jobType].total).to.be(count);
    },

    getCompletedReportCount(stats) {
      return stats.reporting.status.completed;
    },

    expectCompletedReportCount(stats, count) {
      expect(this.getCompletedReportCount(stats)).to.be(count);
    },
  };
}

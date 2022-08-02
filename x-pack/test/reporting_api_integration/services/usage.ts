/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Response } from 'supertest';
import expect from '@kbn/expect';
import { indexTimestamp } from '@kbn/reporting-plugin/server/lib/store/index_timestamp';
import {
  AvailableTotal,
  JobTypes,
  LayoutCounts,
  ReportingUsageType,
} from '@kbn/reporting-plugin/server/usage/types';
import { FtrProviderContext } from '../ftr_provider_context';

// NOTE: the usage stats come from an HTTP API, which converts key names to snake_case
export interface UsageStats {
  reporting: ReportingUsageType & {
    last_7_days: ReportingUsageType['last7Days'];
  };
}

export function createUsageServices({ getService }: FtrProviderContext) {
  const log = getService('log');
  const esSupertest = getService('esSupertest');
  const supertest = getService('supertest');

  return {
    async waitForJobToFinish(downloadReportPath: string, ignoreFailure = false) {
      log.debug(`Waiting for job to finish: ${downloadReportPath}`);
      const JOB_IS_PENDING_CODE = 503;
      let response: Response & { statusCode?: number };

      const statusCode = await new Promise((resolve) => {
        const intervalId = setInterval(async () => {
          response = await supertest.get(downloadReportPath).responseType('blob');
          if (response.statusCode === 503) {
            log.debug(`Report at path ${downloadReportPath} is pending`);
          } else if (response.statusCode === 200) {
            log.debug(`Report at path ${downloadReportPath} is complete`);
          } else {
            log.debug(`Report at path ${downloadReportPath} returned code ${response.statusCode}`);
          }
          if (response.statusCode !== JOB_IS_PENDING_CODE) {
            clearInterval(intervalId);
            resolve(response.statusCode);
          }
        }, 1500);
      });
      if (!ignoreFailure) {
        const jobInfo = await supertest.get(downloadReportPath.replace(/download/, 'info'));
        expect(jobInfo.body.output.warnings).to.be(undefined); // expect no failure message to be present in job info
        expect(statusCode).to.be(200);
      }
    },

    /**
     *
     * @return {Promise<Function>} A function to call to clean up the index alias that was added.
     */
    async coerceReportsIntoExistingIndex(indexName: string) {
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

    async expectAllJobsToFinishSuccessfully(jobPaths: string[]) {
      await Promise.all(
        jobPaths.map(async (path) => {
          log.debug(`wait for job to finish: ${path}`);
          await this.waitForJobToFinish(path);
        })
      );
    },

    expectRecentPdfAppStats(stats: UsageStats, app: string, count: number) {
      const actual =
        stats.reporting.last_7_days.printable_pdf.app![app as keyof AvailableTotal['app']];
      log.info(`expecting recent ${app} stats to have ${count} printable pdfs (actual: ${actual})`);
      expect(actual).to.be(count);
    },

    expectAllTimePdfAppStats(stats: UsageStats, app: string, count: number) {
      const actual = stats.reporting.printable_pdf.app![app as keyof AvailableTotal['app']];
      log.info(
        `expecting all time pdf ${app} stats to have ${count} printable pdfs (actual: ${actual})`
      );
      expect(actual).to.be(count);
    },

    expectRecentPdfLayoutStats(stats: UsageStats, layout: string, count: number) {
      const actual =
        stats.reporting.last_7_days.printable_pdf.layout![layout as keyof LayoutCounts];
      log.info(`expecting recent stats to report ${count} ${layout} layouts (actual: ${actual})`);
      expect(actual).to.be(count);
    },

    expectAllTimePdfLayoutStats(stats: UsageStats, layout: string, count: number) {
      const actual = stats.reporting.printable_pdf.layout![layout as keyof LayoutCounts];
      log.info(`expecting all time stats to report ${count} ${layout} layouts (actual: ${actual})`);
      expect(actual).to.be(count);
    },

    expectRecentJobTypeTotalStats(stats: UsageStats, jobType: string, count: number) {
      const actual = stats.reporting.last_7_days[jobType as keyof JobTypes].total;
      log.info(
        `expecting recent stats to report ${count} ${jobType} job types (actual: ${actual})`
      );
      expect(actual).to.be(count);
    },

    expectAllTimeJobTypeTotalStats(stats: UsageStats, jobType: string, count: number) {
      const actual = stats.reporting[jobType as keyof JobTypes].total;
      log.info(
        `expecting all time stats to report ${count} ${jobType} job types (actual: ${actual})`
      );
      expect(actual).to.be(count);
    },

    getCompletedReportCount(stats: UsageStats) {
      return stats.reporting.status.completed;
    },

    expectCompletedReportCount(stats: UsageStats, count: number) {
      expect(this.getCompletedReportCount(stats)).to.be(count);
    },
  };
}

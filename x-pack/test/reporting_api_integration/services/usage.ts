/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { indexTimestamp } from '../../../plugins/reporting/server/lib/store/index_timestamp';
import {
  AvailableTotal,
  JobTypes,
  LayoutCounts,
  ReportingUsageType,
} from '../../../plugins/reporting/server/usage/types';
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
    async waitForJobToFinish(downloadReportPath: string, ignoreFailure?: boolean) {
      log.debug(`Waiting for job to finish: ${downloadReportPath}`);
      const JOB_IS_PENDING_CODE = 503;

      const statusCode = await new Promise((resolve) => {
        const intervalId = setInterval(async () => {
          const response = (await supertest
            .get(downloadReportPath)
            .responseType('blob')
            .set('kbn-xsrf', 'xxx')) as any;
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
          await this.waitForJobToFinish(path);
        })
      );
    },

    expectRecentPdfAppStats(stats: UsageStats, app: string, count: number) {
      expect(
        stats.reporting.last_7_days.printable_pdf.app![app as keyof AvailableTotal['app']]
      ).to.be(count);
    },

    expectAllTimePdfAppStats(stats: UsageStats, app: string, count: number) {
      expect(stats.reporting.printable_pdf.app![app as keyof AvailableTotal['app']]).to.be(count);
    },

    expectRecentPdfLayoutStats(stats: UsageStats, layout: string, count: number) {
      expect(stats.reporting.last_7_days.printable_pdf.layout![layout as keyof LayoutCounts]).to.be(
        count
      );
    },

    expectAllTimePdfLayoutStats(stats: UsageStats, layout: string, count: number) {
      expect(stats.reporting.printable_pdf.layout![layout as keyof LayoutCounts]).to.be(count);
    },

    expectRecentJobTypeTotalStats(stats: UsageStats, jobType: string, count: number) {
      expect(stats.reporting.last_7_days[jobType as keyof JobTypes].total).to.be(count);
    },

    expectAllTimeJobTypeTotalStats(stats: UsageStats, jobType: string, count: number) {
      expect(stats.reporting[jobType as keyof JobTypes].total).to.be(count);
    },

    getCompletedReportCount(stats: UsageStats) {
      return stats.reporting.status.completed;
    },

    expectCompletedReportCount(stats: UsageStats, count: number) {
      expect(this.getCompletedReportCount(stats)).to.be(count);
    },
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { indexTimestamp } from '@kbn/reporting-plugin/server/lib/store/index_timestamp';
import { services as xpackServices } from '../functional/services';
import { services as apiIntegrationServices } from '../api_integration/services';
import { FtrProviderContext } from './ftr_provider_context';

interface PDFAppCounts {
  app: {
    [appName: string]: number;
  };
  layout: {
    [layoutType: string]: number;
  };
}

export interface ReportingUsageStats {
  available: boolean;
  enabled: boolean;
  total: number;
  last_7_days: {
    total: number;
    printable_pdf: PDFAppCounts;
    [jobType: string]: any;
  };
  printable_pdf: PDFAppCounts;
  status: any;
  [jobType: string]: any;
}

interface UsageStats {
  reporting: ReportingUsageStats;
}

function removeWhitespace(str: string) {
  return str.replace(/\s/g, '');
}

export function ReportingAPIProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');
  const esSupertest = getService('esSupertest');
  const retry = getService('retry');
  const config = getService('config');

  return {
    async waitForJobToFinish(downloadReportPath: string, options?: { timeout?: number }) {
      await retry.waitForWithTimeout(
        `job ${downloadReportPath} finished`,
        options?.timeout ?? config.get('timeouts.kibanaReportCompletion'),
        async () => {
          const response = await supertest
            .get(downloadReportPath)
            .responseType('blob')
            .set('kbn-xsrf', 'xxx');

          if (response.status === 503) {
            log.debug(`Report at path ${downloadReportPath} is pending`);
            return false;
          }

          log.debug(`Report at path ${downloadReportPath} returned code ${response.status}`);

          if (response.status === 200) {
            log.debug(`Report at path ${downloadReportPath} is complete`);
            return true;
          }

          throw new Error(`unexpected status code ${response.status}`);
        }
      );
    },

    async expectAllJobsToFinishSuccessfully(jobPaths: string[]) {
      await Promise.all(
        jobPaths.map(async (path) => {
          await this.waitForJobToFinish(path);
        })
      );
    },

    async postJob(apiPath: string): Promise<string> {
      log.debug(`ReportingAPI.postJob(${apiPath})`);
      const { body } = await supertest
        .post(removeWhitespace(apiPath))
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      return body.path;
    },

    async postJobJSON(apiPath: string, jobJSON: object = {}): Promise<string> {
      log.debug(`ReportingAPI.postJobJSON((${apiPath}): ${JSON.stringify(jobJSON)})`);
      const { body } = await supertest.post(apiPath).set('kbn-xsrf', 'xxx').send(jobJSON);
      return body.path;
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

    async deleteAllReports() {
      log.debug('ReportingAPI.deleteAllReports');

      // ignores 409 errs and keeps retrying
      await retry.tryForTime(5000, async () => {
        await esSupertest
          .post('/.reporting*/_delete_by_query')
          .send({ query: { match_all: {} } })
          .expect(200);
      });
    },

    expectRecentPdfAppStats(stats: UsageStats, app: string, count: number) {
      expect(stats.reporting.last_7_days.printable_pdf.app[app]).to.be(count);
    },

    expectAllTimePdfAppStats(stats: UsageStats, app: string, count: number) {
      expect(stats.reporting.printable_pdf.app[app]).to.be(count);
    },

    expectRecentPdfLayoutStats(stats: UsageStats, layout: string, count: number) {
      expect(stats.reporting.last_7_days.printable_pdf.layout[layout]).to.be(count);
    },

    expectAllTimePdfLayoutStats(stats: UsageStats, layout: string, count: number) {
      expect(stats.reporting.printable_pdf.layout[layout]).to.be(count);
    },

    expectRecentJobTypeTotalStats(stats: UsageStats, jobType: string, count: number) {
      expect(stats.reporting.last_7_days[jobType].total).to.be(count);
    },

    expectAllTimeJobTypeTotalStats(stats: UsageStats, jobType: string, count: number) {
      expect(stats.reporting[jobType].total).to.be(count);
    },

    getCompletedReportCount(stats: UsageStats) {
      return stats.reporting.status.completed;
    },

    expectCompletedReportCount(stats: UsageStats, count: number) {
      expect(this.getCompletedReportCount(stats)).to.be(count);
    },

    getRecentPdfAppStats(stats: UsageStats, app: string) {
      return stats.reporting.last_7_days.printable_pdf.app[app];
    },

    getAllTimePdfAppStats(stats: UsageStats, app: string) {
      return stats.reporting.printable_pdf.app[app];
    },

    getRecentPdfLayoutStats(stats: UsageStats, layout: string) {
      return stats.reporting.last_7_days.printable_pdf.layout[layout];
    },

    getAllTimePdfLayoutStats(stats: UsageStats, layout: string) {
      return stats.reporting.printable_pdf.layout[layout];
    },

    getRecentJobTypeTotalStats(stats: UsageStats, jobType: string) {
      return stats.reporting.last_7_days[jobType].total;
    },

    getAllTimeJobTypeTotalStats(stats: UsageStats, jobType: string) {
      return stats.reporting[jobType].total;
    },
  };
}

export const services = {
  ...xpackServices,
  supertestWithoutAuth: apiIntegrationServices.supertestWithoutAuth,
  usageAPI: apiIntegrationServices.usageAPI,
  reportingAPI: ReportingAPIProvider,
};

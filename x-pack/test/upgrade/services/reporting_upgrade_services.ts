/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  AppCounts,
  JobTypes,
  LayoutCounts,
  ReportingUsageType,
} from '@kbn/reporting-plugin/server/usage/types';
import { services as xpackServices } from '../../functional/services';
import { services as apiIntegrationServices } from '../../api_integration/services';
import { FtrProviderContext } from '../ftr_provider_context';

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

    expectRecentPdfAppStats(stats: ReportingUsageType, app: keyof AppCounts, count: number) {
      expect(stats.last7Days.printable_pdf.app[app]).to.be(count);
    },

    expectAllTimePdfAppStats(stats: ReportingUsageType, app: keyof AppCounts, count: number) {
      expect(stats.printable_pdf.app[app]).to.be(count);
    },

    expectRecentPdfLayoutStats(
      stats: ReportingUsageType,
      layout: keyof LayoutCounts,
      count: number
    ) {
      expect(stats.last7Days.printable_pdf.layout[layout]).to.be(count);
    },

    expectAllTimePdfLayoutStats(
      stats: ReportingUsageType,
      layout: keyof LayoutCounts,
      count: number
    ) {
      expect(stats.printable_pdf.layout[layout]).to.be(count);
    },

    expectRecentJobTypeTotalStats(
      stats: ReportingUsageType,
      jobType: keyof JobTypes,
      count: number
    ) {
      expect(stats.last7Days[jobType].total).to.be(count);
    },

    expectAllTimeJobTypeTotalStats(
      stats: ReportingUsageType,
      jobType: keyof JobTypes,
      count: number
    ) {
      expect(stats[jobType].total).to.be(count);
    },

    getCompletedReportCount(stats: ReportingUsageType) {
      return stats.status.completed;
    },

    expectCompletedReportCount(stats: ReportingUsageType, count: number) {
      expect(this.getCompletedReportCount(stats)).to.be(count);
    },

    getRecentPdfAppStats(stats: ReportingUsageType, app: keyof AppCounts) {
      return stats.last7Days.printable_pdf.app[app];
    },

    getAllTimePdfAppStats(stats: ReportingUsageType, app: keyof AppCounts) {
      return stats.printable_pdf.app[app];
    },

    getRecentPdfLayoutStats(stats: ReportingUsageType, layout: keyof LayoutCounts) {
      return stats.last7Days.printable_pdf.layout[layout];
    },

    getAllTimePdfLayoutStats(stats: ReportingUsageType, layout: keyof LayoutCounts) {
      return stats.printable_pdf.layout[layout];
    },

    getRecentJobTypeTotalStats(stats: ReportingUsageType, jobType: keyof JobTypes) {
      return stats.last7Days[jobType].total;
    },

    getAllTimeJobTypeTotalStats(stats: ReportingUsageType, jobType: keyof JobTypes) {
      return stats[jobType].total;
    },
  };
}

export const services = {
  ...xpackServices,
  supertestWithoutAuth: apiIntegrationServices.supertestWithoutAuth,
  usageAPI: apiIntegrationServices.usageAPI,
  reportingAPI: ReportingAPIProvider,
};

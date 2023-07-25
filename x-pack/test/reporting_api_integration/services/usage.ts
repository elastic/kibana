/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Response } from 'supertest';
import expect from '@kbn/expect';
import {
  AvailableTotal,
  JobTypes,
  LayoutCounts,
  ReportingUsageType,
} from '@kbn/reporting-plugin/server/usage/types';
import { FtrProviderContext } from '../ftr_provider_context';

export function createUsageServices({ getService }: FtrProviderContext) {
  const log = getService('log');
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

    async expectAllJobsToFinishSuccessfully(jobPaths: string[]) {
      await Promise.all(
        jobPaths.map(async (path) => {
          log.debug(`wait for job to finish: ${path}`);
          await this.waitForJobToFinish(path);
        })
      );
    },

    expectRecentPdfAppStats(stats: ReportingUsageType, app: string, count: number) {
      const actual = stats.last7Days.printable_pdf.app![app as keyof AvailableTotal['app']];
      log.info(`expecting recent ${app} stats to have ${count} printable pdfs (actual: ${actual})`);
      expect(actual).to.be(count);
    },

    expectAllTimePdfAppStats(stats: ReportingUsageType, app: string, count: number) {
      const actual = stats.printable_pdf.app![app as keyof AvailableTotal['app']];
      log.info(
        `expecting all time pdf ${app} stats to have ${count} printable pdfs (actual: ${actual})`
      );
      expect(actual).to.be(count);
    },

    expectRecentPdfLayoutStats(stats: ReportingUsageType, layout: string, count: number) {
      const actual = stats.last7Days.printable_pdf.layout![layout as keyof LayoutCounts];
      log.info(`expecting recent stats to report ${count} ${layout} layouts (actual: ${actual})`);
      expect(actual).to.be(count);
    },

    expectAllTimePdfLayoutStats(stats: ReportingUsageType, layout: string, count: number) {
      const actual = stats.printable_pdf.layout![layout as keyof LayoutCounts];
      log.info(`expecting all time stats to report ${count} ${layout} layouts (actual: ${actual})`);
      expect(actual).to.be(count);
    },

    expectRecentJobTypeTotalStats(stats: ReportingUsageType, jobType: string, count: number) {
      const actual = stats.last7Days[jobType as keyof JobTypes].total;
      log.info(
        `expecting recent stats to report ${count} ${jobType} job types (actual: ${actual})`
      );
      expect(actual).to.be(count);
    },

    expectAllTimeJobTypeTotalStats(stats: ReportingUsageType, jobType: string, count: number) {
      const actual = stats[jobType as keyof JobTypes].total;
      log.info(
        `expecting all time stats to report ${count} ${jobType} job types (actual: ${actual})`
      );
      expect(actual).to.be(count);
    },

    getCompletedReportCount(stats: ReportingUsageType) {
      return stats.status.completed;
    },

    expectCompletedReportCount(stats: ReportingUsageType, count: number) {
      expect(this.getCompletedReportCount(stats)).to.be(count);
    },
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

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

export function createUsageServices({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');

  return {
    async waitForJobToFinish(downloadReportPath: string) {
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

      expect(statusCode).to.be(200);
    },

    async expectAllJobsToFinishSuccessfully(jobPaths: string[]) {
      await Promise.all(
        jobPaths.map(async (path) => {
          await this.waitForJobToFinish(path);
        })
      );
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
  };
}

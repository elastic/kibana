/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { INTERNAL_ROUTES, PUBLIC_ROUTES } from '@kbn/reporting-common';
import { Response } from 'supertest';
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
        const jobInfo = await supertest.get(
          downloadReportPath.replace(
            PUBLIC_ROUTES.JOBS.DOWNLOAD_PREFIX,
            INTERNAL_ROUTES.JOBS.INFO_PREFIX
          )
        );
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
  };
}

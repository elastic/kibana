/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import type { ReportingJobResponse } from '@kbn/reporting-plugin/server/types';
import rison from '@kbn/rison';
import { CookieCredentials } from '@kbn/ftr-common-functional-services';
import { FtrProviderContext } from '../../functional/ftr_provider_context';
import { InternalRequestHeader } from '.';

const API_HEADER: [string, string] = ['kbn-xsrf', 'reporting'];

/**
 * Services to handle report job lifecycle phases for tests
 */
export function SvlReportingServiceProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const config = getService('config');

  return {
    /**
     * Use the internal API to create any kind of report job
     */
    async createReportJobInternal(
      jobType: string,
      job: object,
      cookieCredentials: CookieCredentials,
      internalReqHeader: InternalRequestHeader
    ) {
      const requestPath = `${INTERNAL_ROUTES.GENERATE_PREFIX}/${jobType}`;
      log.debug(`POST request to ${requestPath}`);

      const { body }: { status: number; body: ReportingJobResponse } = await supertestWithoutAuth
        .post(requestPath)
        .set(internalReqHeader)
        .set(cookieCredentials)
        .send({ jobParams: rison.encode(job) })
        .expect(200);

      log.info(`ReportingAPI.createReportJobInternal created report job` + ` ${body.job.id}`);

      return {
        job: body.job,
        path: body.path,
      };
    },

    /*
     * If a test requests a report, it must wait for the job to finish before deleting the report.
     * Otherwise, report task success metrics will be affected.
     */
    async waitForJobToFinish(
      downloadReportPath: string,
      cookieCredentials: CookieCredentials,
      internalReqHeader: InternalRequestHeader,
      options?: { timeout?: number }
    ) {
      await retry.waitForWithTimeout(
        `job ${downloadReportPath} finished`,
        options?.timeout ?? config.get('timeouts.kibanaReportCompletion'),
        async () => {
          const response = await supertestWithoutAuth
            .get(`${downloadReportPath}?elasticInternalOrigin=true`)
            .responseType('blob')
            .set(...API_HEADER)
            .set(internalReqHeader)
            .set(cookieCredentials);

          if (response.status === 500) {
            throw new Error(`Report at path ${downloadReportPath} has failed`);
          }

          if (response.status === 503) {
            log.debug(`Report at path ${downloadReportPath} is pending`);

            // add a delay before retrying
            await new Promise((resolve) => setTimeout(resolve, 2500));

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

    /*
     * This function is only used in the API tests, functional tests we have to click the download link in the UI
     */
    async getCompletedJobOutput(
      downloadReportPath: string,
      cookieCredentials: CookieCredentials,
      internalReqHeader: InternalRequestHeader
    ) {
      const response = await supertestWithoutAuth
        .get(`${downloadReportPath}?elasticInternalOrigin=true`)
        .set(internalReqHeader)
        .set(cookieCredentials);
      return response.text as unknown;
    },

    /*
     * Ensures reports are cleaned up through the delete report API
     */
    async deleteReport(
      reportId: string,
      cookieCredentials: CookieCredentials,
      internalReqHeader: InternalRequestHeader
    ) {
      log.debug(`ReportingAPI.deleteReport ${INTERNAL_ROUTES.JOBS.DELETE_PREFIX}/${reportId}`);
      const response = await supertestWithoutAuth
        .delete(INTERNAL_ROUTES.JOBS.DELETE_PREFIX + `/${reportId}`)
        .set(internalReqHeader)
        .set(cookieCredentials)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      return response.text as unknown;
    },
  };
}

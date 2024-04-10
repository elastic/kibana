/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import expect from '@kbn/expect';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import type { ReportingJobResponse } from '@kbn/reporting-plugin/server/types';
import rison from '@kbn/rison';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

const API_HEADER: [string, string] = ['kbn-xsrf', 'reporting'];
const INTERNAL_HEADER: [string, string] = [X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'Kibana'];

/**
 * Services to create roles and users for security testing
 */
export function SvlReportingServiceProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const config = getService('config');

  const REPORTING_USER_USERNAME = config.get('servers.kibana.username');
  const REPORTING_USER_PASSWORD = config.get('servers.kibana.password');

  return {
    /**
     * Use the internal API to create any kind of report job
     */
    async createReportJobInternal(
      jobType: string,
      job: object,
      username: string = REPORTING_USER_USERNAME,
      password: string = REPORTING_USER_PASSWORD
    ) {
      const requestPath = `${INTERNAL_ROUTES.GENERATE_PREFIX}/${jobType}`;
      log.debug(`POST request to ${requestPath}`);

      const { status, body } = await supertest
        .post(requestPath)
        .auth(username, password)
        .set(...API_HEADER)
        .set(...INTERNAL_HEADER)
        .send({ jobParams: rison.encode(job) });

      expect(status).to.be(200);

      return {
        job: (body as ReportingJobResponse).job,
        path: (body as ReportingJobResponse).path,
      };
    },

    /*
     * This function is only used in the API tests
     */
    async waitForJobToFinish(
      downloadReportPath: string,
      username = REPORTING_USER_USERNAME,
      password = REPORTING_USER_PASSWORD,
      options?: { timeout?: number }
    ) {
      await retry.waitForWithTimeout(
        `job ${downloadReportPath} finished`,
        options?.timeout ?? config.get('timeouts.kibanaReportCompletion'),
        async () => {
          const response = await supertest
            .get(`${downloadReportPath}?elasticInternalOrigin=true`)
            .auth(username, password)
            .responseType('blob')
            .set(...API_HEADER)
            .set(...INTERNAL_HEADER);

          if (response.status === 500) {
            throw new Error(`Report at path ${downloadReportPath} has failed`);
          }

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

    /*
     * This function is only used in the API tests, funtional tests we have to click the download link in the UI
     */
    async getCompletedJobOutput(
      downloadReportPath: string,
      username = REPORTING_USER_USERNAME,
      password = REPORTING_USER_PASSWORD
    ) {
      const response = await supertest
        .get(`${downloadReportPath}?elasticInternalOrigin=true`)
        .auth(username, password);
      return response.text as unknown;
    },
    async deleteAllReports() {
      log.debug('ReportingAPI.deleteAllReports');

      // ignores 409 errs and keeps retrying
      await retry.tryForTime(5000, async () => {
        await supertest
          .post('/.reporting*/_delete_by_query')
          .send({ query: { match_all: {} } })
          .expect(200);
      });
    },
  };
}

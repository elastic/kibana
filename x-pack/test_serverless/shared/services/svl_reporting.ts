/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import type { ReportingJobResponse } from '@kbn/reporting-plugin/server/types';
import { REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY } from '@kbn/reporting-server';
import rison from '@kbn/rison';
import { FtrProviderContext } from '../../functional/ftr_provider_context';
import { RoleCredentials } from '.';
import { InternalRequestHeader } from '.';

const API_HEADER: [string, string] = ['kbn-xsrf', 'reporting'];

/**
 * Services to create roles and users for security testing
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
      roleAuthc: RoleCredentials,
      internalReqHeader: InternalRequestHeader
    ) {
      const requestPath = `${INTERNAL_ROUTES.GENERATE_PREFIX}/${jobType}`;
      log.debug(`POST request to ${requestPath}`);

      const { status, body } = await supertestWithoutAuth
        .post(requestPath)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
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
      roleAuthc: RoleCredentials,
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
            .set(roleAuthc.apiKeyHeader);

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
      roleAuthc: RoleCredentials,
      internalReqHeader: InternalRequestHeader
    ) {
      const response = await supertestWithoutAuth
        .get(`${downloadReportPath}?elasticInternalOrigin=true`)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader);
      return response.text as unknown;
    },
    async deleteAllReports(roleAuthc: RoleCredentials, internalReqHeader: InternalRequestHeader) {
      log.debug('ReportingAPI.deleteAllReports');

      // ignores 409 errs and keeps retrying
      await retry.tryForTime(5000, async () => {
        await supertestWithoutAuth
          .post(`/${REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY}/_delete_by_query`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader)
          .send({ query: { match_all: {} } });
      });
    },
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { INTERNAL_ROUTES } from '@kbn/reporting-plugin/common/constants';
import expect from '@kbn/expect';
import type { ReportingJobResponse } from '@kbn/reporting-plugin/server/types';
import rison from '@kbn/rison';
import { JobParamsCSV } from '@kbn/reporting-plugin/common/types/export_types/csv_searchsource';
import { FtrProviderContext } from '../ftr_provider_context';

const API_HEADER: [string, string] = ['kbn-xsrf', 'reporting'];
const INTERNAL_HEADER: [string, string] = [X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'Kibana'];

const DATA_ANALYST_PASSWORD = 'data_analyst-password';
const DATA_ANALYST_ROLE = 'data_analyst_role';
const DATA_ANALYST_USERNAME = 'data_analyst';
const REPORTING_ROLE = 'reporting_user_role';
const REPORTING_USER_PASSWORD = 'reporting_user-password';
const REPORTING_USER_USERNAME = 'reporting_user';

/**
 * Services to create roles and users for security testing
 */
export function SvlReportingServiceProvider({ getService }: FtrProviderContext) {
  const security = getService('security');
  const log = getService('log');
  const supertest = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const config = getService('config');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  return {
    DATA_ANALYST_PASSWORD,
    DATA_ANALYST_USERNAME,
    REPORTING_USER_PASSWORD,
    REPORTING_USER_USERNAME,

    /**
     * Define a role that DOES NOT grant privileges to create any type of report.
     */
    async createDataAnalystRole() {
      await security.role.create(DATA_ANALYST_ROLE, {
        metadata: {},
        elasticsearch: {
          cluster: [],
          indices: [
            {
              names: ['ecommerce'],
              privileges: ['read', 'view_index_metadata'],
              allow_restricted_indices: false,
            },
          ],
          run_as: [],
        },
        kibana: [
          {
            base: ['read'],
            feature: {},
            spaces: ['*'],
          },
        ],
      });
    },

    async createDataAnalystUser() {
      await security.user.create(DATA_ANALYST_USERNAME, {
        password: DATA_ANALYST_PASSWORD,
        roles: [DATA_ANALYST_ROLE],
        full_name: 'Data Analyst User',
      });
    },

    /**
     * Define a role that DOES grant privileges to create certain types of reports.
     */
    async createReportingRole() {
      await security.role.create(REPORTING_ROLE, {
        metadata: {},
        elasticsearch: {
          cluster: [],
          indices: [
            {
              names: ['ecommerce'],
              privileges: ['read', 'view_index_metadata'],
              allow_restricted_indices: false,
            },
          ],
          run_as: [],
        },
        kibana: [
          {
            base: [],
            feature: { discover: ['minimal_read', 'generate_report'] },
            spaces: ['*'],
          },
        ],
      });
    },

    async createReportingUser(
      username = REPORTING_USER_USERNAME,
      password = REPORTING_USER_PASSWORD
    ) {
      await security.user.create(username, {
        password,
        roles: [REPORTING_ROLE],
        full_name: 'Reporting User',
      });
    },

    /**
     * Use the internal API to create any kind of report job
     */
    async createReportJobInternal(
      jobType: string,
      job: object,
      username: string,
      password: string
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

      return (body as ReportingJobResponse).job.id;
    },
    async initEcommerce() {
      const ecommerceSOPath =
        'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce.json';
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce');
      await kibanaServer.importExport.load(ecommerceSOPath);
    },
    async generateCsv(
      job: JobParamsCSV,
      username: string = 'test_user',
      password: string = 'changeme'
    ) {
      const jobParams = rison.encode(job);
      return await supertest
        .post(`${INTERNAL_ROUTES.GENERATE_PREFIX}/csv_searchsource?elasticInternalOrigin=true`)
        .auth(username, password)
        .set(...API_HEADER)
        .set(...INTERNAL_HEADER)
        .send({ jobParams });
    },
    async getCompletedJobOutput(
      downloadReportPath: string,
      username: string = 'test_user',
      password: string = 'changeme'
    ) {
      const response = await supertest
        .get(`${downloadReportPath}?elasticInternalOrigin=true`)
        .auth(username, password);
      return response.text as unknown;
    },
    async deleteAllReports(username: string = 'test_user', password: string = 'changeme') {
      log.debug('ReportingAPI.deleteAllReports');

      // ignores 409 errs and keeps retrying
      await retry.tryForTime(5000, async () => {
        await supertest
          .post(`${INTERNAL_ROUTES.JOBS.DELETE_PREFIX}/.reporting*/_delete_by_query`)
          .send({ query: { match_all: {} } })
          .auth(username, password)
          .set(...API_HEADER)
          .set(...INTERNAL_HEADER)
          .expect(200);
      });
    },
    async waitForJobToFinish(
      downloadReportPath: string,
      username: string = 'test_user',
      password: string = 'changeme',
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
    async initLogs() {
      const logsSOPath = 'x-pack/test/functional/fixtures/kbn_archiver/reporting/logs';
      await esArchiver.load('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(logsSOPath);
    },
  };
}

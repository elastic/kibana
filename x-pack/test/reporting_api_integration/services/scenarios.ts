/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison, { RisonValue } from 'rison-node';
import {
  API_GET_ILM_POLICY_STATUS,
  API_MIGRATE_ILM_POLICY_URL,
} from '../../../plugins/reporting/common/constants';
import { JobParamsCSV } from '../../../plugins/reporting/server/export_types/csv_searchsource/types';
import { JobParamsDownloadCSV } from '../../../plugins/reporting/server/export_types/csv_searchsource_immediate/types';
import { JobParamsPNGDeprecated } from '../../../plugins/reporting/server/export_types/png/types';
import { JobParamsPDFDeprecated } from '../../../plugins/reporting/server/export_types/printable_pdf/types';
import { FtrProviderContext } from '../ftr_provider_context';

function removeWhitespace(str: string) {
  return str.replace(/\s/g, '');
}

export function createScenarios({ getService }: Pick<FtrProviderContext, 'getService'>) {
  const security = getService('security');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const supertest = getService('supertest');
  const esSupertest = getService('esSupertest');
  const kibanaServer = getService('kibanaServer');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');

  const ecommerceSOPath = 'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce.json';
  const logsSOPath = 'x-pack/test/functional/fixtures/kbn_archiver/reporting/logs';

  const DATA_ANALYST_USERNAME = 'data_analyst';
  const DATA_ANALYST_PASSWORD = 'data_analyst-password';
  const REPORTING_USER_USERNAME = 'reporting_user';
  const REPORTING_USER_PASSWORD = 'reporting_user-password';
  const REPORTING_ROLE = 'test_reporting_user';

  const logTaskManagerHealth = async () => {
    // Check task manager health for analyzing test failures. See https://github.com/elastic/kibana/issues/114946
    const tmHealth = await supertest.get(`/api/task_manager/_health`);
    const driftValues = tmHealth.body?.stats?.runtime?.value;

    log.info(`Task Manager status: "${tmHealth.body?.status}"`);
    log.info(`Task Manager overall drift rankings: "${JSON.stringify(driftValues?.drift)}"`);
    log.info(
      `Task Manager drift rankings for "report:execute": "${JSON.stringify(
        driftValues?.drift_by_type?.['report:execute']
      )}"`
    );
  };

  const initEcommerce = async () => {
    await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce');
    await kibanaServer.importExport.load(ecommerceSOPath);
  };
  const teardownEcommerce = async () => {
    await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
    await kibanaServer.importExport.unload(ecommerceSOPath);
    await deleteAllReports();
  };

  const initLogs = async () => {
    await esArchiver.load('x-pack/test/functional/es_archives/logstash_functional');
    await kibanaServer.importExport.load(logsSOPath);
  };
  const teardownLogs = async () => {
    await kibanaServer.importExport.unload(logsSOPath);
    await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
  };

  const createDataAnalystRole = async () => {
    await security.role.create('data_analyst', {
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
      kibana: [{ base: ['read'], feature: {}, spaces: ['*'] }],
    });
  };

  const createTestReportingUserRole = async () => {
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
          feature: {
            dashboard: ['minimal_read', 'download_csv_report', 'generate_report'],
            discover: ['minimal_read', 'generate_report'],
            canvas: ['minimal_read', 'generate_report'],
            visualize: ['minimal_read', 'generate_report'],
          },
          spaces: ['*'],
        },
      ],
    });
  };

  const createDataAnalyst = async () => {
    await security.user.create('data_analyst', {
      password: 'data_analyst-password',
      roles: ['data_analyst'],
      full_name: 'Data Analyst User',
    });
  };

  const createTestReportingUser = async () => {
    await security.user.create(REPORTING_USER_USERNAME, {
      password: REPORTING_USER_PASSWORD,
      roles: [REPORTING_ROLE],
      full_name: 'Reporting User',
    });
  };

  const downloadCsv = async (username: string, password: string, job: JobParamsDownloadCSV) => {
    return await supertestWithoutAuth
      .post(`/api/reporting/v1/generate/immediate/csv_searchsource`)
      .auth(username, password)
      .set('kbn-xsrf', 'xxx')
      .send(job);
  };
  const generatePdf = async (username: string, password: string, job: JobParamsPDFDeprecated) => {
    const jobParams = rison.encode(job as object as RisonValue);
    return await supertestWithoutAuth
      .post(`/api/reporting/generate/printablePdf`)
      .auth(username, password)
      .set('kbn-xsrf', 'xxx')
      .send({ jobParams });
  };
  const generatePng = async (username: string, password: string, job: JobParamsPNGDeprecated) => {
    const jobParams = rison.encode(job as object as RisonValue);
    return await supertestWithoutAuth
      .post(`/api/reporting/generate/png`)
      .auth(username, password)
      .set('kbn-xsrf', 'xxx')
      .send({ jobParams });
  };
  const generateCsv = async (
    job: JobParamsCSV,
    username = 'elastic',
    password = process.env.TEST_KIBANA_PASS || 'changeme'
  ) => {
    const jobParams = rison.encode(job as object as RisonValue);

    return await supertestWithoutAuth
      .post(`/api/reporting/generate/csv_searchsource`)
      .auth(username, password)
      .set('kbn-xsrf', 'xxx')
      .send({ jobParams });
  };

  const postJob = async (apiPath: string): Promise<string> => {
    log.debug(`ReportingAPI.postJob(${apiPath})`);
    const { body } = await supertest
      .post(removeWhitespace(apiPath))
      .set('kbn-xsrf', 'xxx')
      .expect(200);
    return body.path;
  };

  const postJobJSON = async (apiPath: string, jobJSON: object = {}): Promise<string> => {
    log.debug(`ReportingAPI.postJobJSON((${apiPath}): ${JSON.stringify(jobJSON)})`);
    const { body } = await supertest.post(apiPath).set('kbn-xsrf', 'xxx').send(jobJSON);
    return body.path;
  };

  const getCompletedJobOutput = async (downloadReportPath: string) => {
    const response = await supertest.get(downloadReportPath);
    return response.text as unknown;
  };

  const getJobErrorCode = async (
    id: string,
    username = 'elastic',
    password = process.env.TEST_KIBANA_PASS || 'changeme'
  ): Promise<undefined | string> => {
    const {
      body: [job],
    } = await supertestWithoutAuth
      .get(`/api/reporting/jobs/list?page=0&ids=${id}`)
      .auth(username, password)
      .set('kbn-xsrf', 'xxx')
      .send()
      .expect(200);
    return job?.output?.error_code;
  };

  const deleteAllReports = async () => {
    log.debug('ReportingAPI.deleteAllReports');

    // ignores 409 errs and keeps retrying
    await retry.tryForTime(5000, async () => {
      await esSupertest
        .post('/.reporting*/_delete_by_query')
        .send({ query: { match_all: {} } })
        .expect(200);
    });
  };

  const checkIlmMigrationStatus = async (username: string, password: string) => {
    log.debug('ReportingAPI.checkIlmMigrationStatus');
    const { body } = await supertestWithoutAuth
      .get(API_GET_ILM_POLICY_STATUS)
      .auth(username, password)
      .set('kbn-xsrf', 'xxx')
      .expect(200);
    return body.status;
  };

  const migrateReportingIndices = async (username: string, password: string) => {
    log.debug('ReportingAPI.migrateReportingIndices');
    try {
      await supertestWithoutAuth
        .put(API_MIGRATE_ILM_POLICY_URL)
        .auth(username, password)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
    } catch (err) {
      log.error(`Could not migrate Reporting indices!`);
      log.error(err);
      throw err;
    }
  };

  const makeAllReportingIndicesUnmanaged = async () => {
    log.debug('ReportingAPI.makeAllReportingIndicesUnmanaged');
    const settings = {
      'index.lifecycle.name': null,
    };
    await esSupertest
      .put('/.reporting*/_settings')
      .send({
        settings,
      })
      .expect(200);
  };

  return {
    logTaskManagerHealth,
    initEcommerce,
    teardownEcommerce,
    initLogs,
    teardownLogs,
    DATA_ANALYST_USERNAME,
    DATA_ANALYST_PASSWORD,
    REPORTING_USER_USERNAME,
    REPORTING_USER_PASSWORD,
    REPORTING_ROLE,
    routes: {
      API_GET_ILM_POLICY_STATUS,
      API_MIGRATE_ILM_POLICY_URL,
    },
    createDataAnalystRole,
    createDataAnalyst,
    createTestReportingUserRole,
    createTestReportingUser,
    downloadCsv,
    generatePdf,
    generatePng,
    generateCsv,
    postJob,
    postJobJSON,
    getCompletedJobOutput,
    deleteAllReports,
    checkIlmMigrationStatus,
    migrateReportingIndices,
    makeAllReportingIndicesUnmanaged,
    getJobErrorCode,
  };
}

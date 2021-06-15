/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison, { RisonValue } from 'rison-node';
import { JobParamsCSV } from '../../../plugins/reporting/server/export_types/csv_searchsource/types';
import { JobParamsDownloadCSV } from '../../../plugins/reporting/server/export_types/csv_searchsource_immediate/types';
import { JobParamsPNG } from '../../../plugins/reporting/server/export_types/png/types';
import { JobParamsPDF } from '../../../plugins/reporting/server/export_types/printable_pdf/types';
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
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');

  const DATA_ANALYST_USERNAME = 'data_analyst';
  const DATA_ANALYST_PASSWORD = 'data_analyst-password';
  const REPORTING_USER_USERNAME = 'reporting_user';
  const REPORTING_USER_PASSWORD = 'reporting_user-password';

  const initEcommerce = async () => {
    await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce');
    await esArchiver.load('x-pack/test/functional/es_archives/reporting/ecommerce_kibana');
  };
  const teardownEcommerce = async () => {
    await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce');
    await esArchiver.unload('x-pack/test/functional/es_archives/reporting/ecommerce_kibana');
    await deleteAllReports();
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
    await security.role.create('test_reporting_user', {
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
    await security.user.create('reporting_user', {
      password: 'reporting_user-password',
      roles: ['test_reporting_user'],
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
  const generatePdf = async (username: string, password: string, job: JobParamsPDF) => {
    const jobParams = rison.encode((job as object) as RisonValue);
    return await supertestWithoutAuth
      .post(`/api/reporting/generate/printablePdf`)
      .auth(username, password)
      .set('kbn-xsrf', 'xxx')
      .send({ jobParams });
  };
  const generatePng = async (username: string, password: string, job: JobParamsPNG) => {
    const jobParams = rison.encode((job as object) as RisonValue);
    return await supertestWithoutAuth
      .post(`/api/reporting/generate/png`)
      .auth(username, password)
      .set('kbn-xsrf', 'xxx')
      .send({ jobParams });
  };
  const generateCsv = async (username: string, password: string, job: JobParamsCSV) => {
    const jobParams = rison.encode((job as object) as RisonValue);
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

  return {
    initEcommerce,
    teardownEcommerce,
    DATA_ANALYST_USERNAME,
    DATA_ANALYST_PASSWORD,
    REPORTING_USER_USERNAME,
    REPORTING_USER_PASSWORD,
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
    deleteAllReports,
  };
}

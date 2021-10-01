/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

import { JOB_PARAMS_RISON_CSV_DEPRECATED } from '../../reporting_api_integration/services/fixtures';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common } = getPageObjects(['common']);
  const retry = getService('retry');
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const reporting = getService('reporting');
  const esArchiver = getService('esArchiver');
  const security = getService('security');

  describe('Reporting', () => {
    const createReportingUser = async () => {
      await security.user.create(reporting.REPORTING_USER_USERNAME, {
        password: reporting.REPORTING_USER_PASSWORD,
        roles: ['reporting_user', 'data_analyst', 'kibana_user'], // Deprecated: using built-in `reporting_user` role grants all Reporting privileges
        full_name: 'a reporting user',
      });
    };

    const deleteReportingUser = async () => {
      await security.user.delete(reporting.REPORTING_USER_USERNAME);
    };

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/logs');
      await esArchiver.load('x-pack/test/functional/es_archives/logstash_functional');

      await createReportingUser();
      await reporting.loginReportingUser();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/logs');
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');

      await deleteReportingUser();
    });

    beforeEach(async () => {
      // Add one report
      await supertestWithoutAuth
        .post(`/api/reporting/generate/csv`)
        .auth(reporting.REPORTING_USER_USERNAME, reporting.REPORTING_USER_PASSWORD)
        .set('kbn-xsrf', 'xxx')
        .send({ jobParams: JOB_PARAMS_RISON_CSV_DEPRECATED })
        .expect(200);

      await retry.waitFor('Reporting app', async () => {
        await common.navigateToApp('reporting');
        return testSubjects.exists('reportingPageHeader');
      });
    });

    afterEach(async () => {
      await reporting.deleteAllReports();
    });

    it('List reports view', async () => {
      await retry.waitForWithTimeout('A reporting list item', 5000, () => {
        return testSubjects.exists('reportingListItemObjectTitle');
      });
      await a11y.testAppSnapshot();
    });
  });
}

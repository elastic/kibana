/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common } = getPageObjects(['common']);
  const retry = getService('retry');
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const reporting = getService('reporting');
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
      await reporting.initEcommerce();
      await createReportingUser();
      await reporting.loginReportingUser();
    });

    after(async () => {
      await reporting.teardownLogs();
      await deleteReportingUser();
    });

    beforeEach(async () => {
      await reporting.generateCsv({
        title: 'CSV Report',
        browserTimezone: 'UTC',
        objectType: 'search',
        version: '7.15.0',
        searchSource: {
          version: true,
          query: { query: '', language: 'kuery' },
          index: '5193f870-d861-11e9-a311-0fa548c5f953',
          fields: ['*'],
          filter: [],
        },
      });

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

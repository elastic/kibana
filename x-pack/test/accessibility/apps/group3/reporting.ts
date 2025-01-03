/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common } = getPageObjects(['common']);
  const retry = getService('retry');
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const reporting = getService('reporting');
  const security = getService('security');
  const log = getService('log');

  describe('Reporting Accessibility', () => {
    const createReportingUser = async () => {
      await security.user.create(reporting.REPORTING_USER_USERNAME, {
        password: reporting.REPORTING_USER_PASSWORD,
        roles: ['data_analyst', 'kibana_user'],
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
      // Add one report
      const { body } = await reporting.generateCsv(
        {
          title: 'CSV Report',
          browserTimezone: 'UTC',
          objectType: 'search',
          version: '7.15.0',
          searchSource: {
            version: true,
            query: { query: '', language: 'kuery' },
            index: '5193f870-d861-11e9-a311-0fa548c5f953',
            fields: ['*'],
          },
        },
        reporting.REPORTING_USER_USERNAME,
        reporting.REPORTING_USER_PASSWORD
      );

      log.info(`Queued report job: ${body.path}`);

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
      await retry.try(async () => {
        await a11y.testAppSnapshot();
      });
    });
  });
}

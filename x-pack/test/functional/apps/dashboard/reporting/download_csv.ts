/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { REPO_ROOT } from '@kbn/dev-utils';
import expect from '@kbn/expect';
import fs from 'fs';
import path from 'path';
import * as Rx from 'rxjs';
import { filter, first, map, timeout } from 'rxjs/operators';
import { FtrProviderContext } from '../../../ftr_provider_context';

const csvPath = path.resolve(REPO_ROOT, 'target/functional-tests/downloads/Ecommerce Data.csv');

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['reporting', 'common', 'dashboard']);

  describe('Reporting Download CSV', () => {
    before('initialize tests', async () => {
      log.debug('ReportingPage:initTests');
      await esArchiver.loadIfNeeded('reporting/ecommerce');
      await esArchiver.loadIfNeeded('reporting/ecommerce_kibana');
      await browser.setWindowSize(1600, 850);
    });

    after('clean up archives and previous file download', async () => {
      await esArchiver.unload('reporting/ecommerce');
      await esArchiver.unload('reporting/ecommerce_kibana');
      try {
        fs.unlinkSync(csvPath);
      } catch (e) {
        // nothing to worry
      }
    });

    it('Downloads a CSV export of a saved search panel', async function () {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
      const savedSearchPanel = await testSubjects.find('embeddablePanelHeading-EcommerceData');
      await dashboardPanelActions.toggleContextMenu(savedSearchPanel);

      await testSubjects.existOrFail('embeddablePanelAction-downloadCsvReport'); // wait for the full panel to display or else the test runner could click the wrong option!
      await testSubjects.click('embeddablePanelAction-downloadCsvReport');
      await testSubjects.existOrFail('csvDownloadStarted'); // validate toast panel

      // check every 100ms for the file to exist in the download dir
      // just wait up to 5 seconds
      const success$ = Rx.interval(100).pipe(
        map(() => fs.existsSync(csvPath)),
        filter((value) => value === true),
        first(),
        timeout(5000)
      );

      const fileExists = await success$.toPromise();
      expect(fileExists).to.be(true);

      // no need to validate download contents, API Integration tests do that some different variations
    });
  });
}

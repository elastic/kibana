/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'reporting']);
  const esArchiver = getService('esArchiver');
  const listingTable = getService('listingTable');

  describe('lens reporting', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('lens/reporting');
    });

    after(async () => {
      await esArchiver.unload('lens/reporting');
    });

    it('should not cause PDF reports to fail', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await listingTable.clickItemLink('dashboard', 'Lens reportz');
      await PageObjects.reporting.openPdfReportingPanel();
      await PageObjects.reporting.clickGenerateReportButton();
      const url = await PageObjects.reporting.getReportURL(60000);

      expect(url).to.be.ok();
    });
  });
}

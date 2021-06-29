/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'reporting']);
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const listingTable = getService('listingTable');
  const security = getService('security');

  describe('lens reporting', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/lens/reporting');
      await security.role.create('test_reporting_user', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: { dashboard: ['minimal_read', 'generate_report'] },
          },
        ],
      });
      await security.testUser.setRoles(
        ['test_logstash_reader', 'global_dashboard_read', 'test_reporting_user'],
        false
      );
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/lens/reporting');
      await es.deleteByQuery({
        index: '.reporting-*',
        refresh: true,
        body: { query: { match_all: {} } },
      });
      await security.testUser.restoreDefaults();
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

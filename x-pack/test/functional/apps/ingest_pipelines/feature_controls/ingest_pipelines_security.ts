/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'settings', 'security']);
  const appsMenu = getService('appsMenu');
  const managementMenu = getService('managementMenu');

  // FLAKY: https://github.com/elastic/kibana/issues/132159
  describe.skip('security', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await PageObjects.common.navigateToApp('home');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('global all privileges (aka kibana_admin)', () => {
      before(async () => {
        await security.testUser.setRoles(['kibana_admin']);
      });
      after(async () => {
        await security.testUser.restoreDefaults();
      });

      it('should show the Stack Management nav link', async () => {
        const links = await appsMenu.readLinks();
        expect(links.map((link) => link.text)).to.contain('Stack Management');
      });

      it('should not render the "Ingest" section', async () => {
        await PageObjects.common.navigateToApp('management');
        const sections = (await managementMenu.getSections()).map((section) => section.sectionId);
        expect(sections).to.eql(['insightsAndAlerting', 'kibana']);
      });
    });

    describe('global dashboard read with ingest_pipelines_user', () => {
      before(async () => {
        await security.testUser.setRoles(['global_dashboard_read', 'ingest_pipelines_user']);
      });
      after(async () => {
        await security.testUser.restoreDefaults();
      });
      it('should show the Stack Management nav link', async () => {
        const links = await appsMenu.readLinks();
        expect(links.map((link) => link.text)).to.contain('Stack Management');
      });

      it('should render the "Ingest" section with ingest pipelines', async () => {
        await PageObjects.common.navigateToApp('management');
        const sections = await managementMenu.getSections();
        // We gave the ingest pipelines user access to advanced settings to allow them to use ingest pipelines.
        // See https://github.com/elastic/kibana/pull/102409/
        expect(sections).to.have.length(2);
        expect(sections[0]).to.eql({
          sectionId: 'ingest',
          sectionLinks: ['ingest_pipelines'],
        });
      });
    });
  });
}

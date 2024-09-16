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

  describe('security', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await PageObjects.common.navigateToApp('home');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('global all privileges (aka kibana_admin)', function () {
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

      describe('"Ingest section"', function () {
        this.tags('skipFIPS');
        it('should not render', async function () {
          await PageObjects.common.navigateToApp('management');
          const sections = (await managementMenu.getSections()).map((section) => section.sectionId);
          expect(sections).to.eql(['insightsAndAlerting', 'kibana']);
        });
      });
    });

    describe('global dashboard read with logstash_read_user', () => {
      before(async () => {
        await security.testUser.setRoles(['global_dashboard_read', 'logstash_read_user']);
      });
      after(async () => {
        await security.testUser.restoreDefaults();
      });
      it('should show the Stack Management nav link', async () => {
        const links = await appsMenu.readLinks();
        expect(links.map((link) => link.text)).to.contain('Stack Management');
      });

      describe('"Ingest" section with Logstash Pipelines', function () {
        this.tags('skipFIPS');
        it('should render', async () => {
          await PageObjects.common.navigateToApp('management');
          const sections = await managementMenu.getSections();
          expect(sections).to.have.length(1);
          expect(sections[0]).to.eql({
            sectionId: 'ingest',
            sectionLinks: ['pipelines'],
          });
        });
      });
    });
  });
}

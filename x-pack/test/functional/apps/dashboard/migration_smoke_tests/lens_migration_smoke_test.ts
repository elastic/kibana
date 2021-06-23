/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* This test is importing saved objects from 7.13.0 to 8.0 and the backported version
 * will import from 6.8.x to 7.x.x
 */

import expect from '@kbn/expect';
import path from 'path';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const dashboardPanelActions = getService('dashboardPanelActions');

  const PageObjects = getPageObjects(['common', 'settings', 'header', 'savedObjects', 'dashboard']);

  describe('Export import saved objects between versions', () => {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'x-pack/test/functional/es_archives/getting_started/shakespeare'
      );
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', 'lens_dashboard_migration_test_7_12_1.ndjson')
      );
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/getting_started/shakespeare');
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
    });

    it('should be able to import dashboard with various Lens panels from 7.12.1', async () => {
      // this will catch cases where there is an error in the migrations.
      await PageObjects.savedObjects.checkImportSucceeded();
      await PageObjects.savedObjects.clickImportDone();
    });

    it('should render all panels on the dashboard', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('[7.12.1] Lens By Value Test Dashboard');

      // dashboard should load properly
      await PageObjects.dashboard.expectOnDashboard('[7.12.1] Lens By Value Test Dashboard');
      await PageObjects.dashboard.waitForRenderComplete();

      // There should be 0 error embeddables on the dashboard
      const errorEmbeddables = await testSubjects.findAll('embeddableStackError');
      expect(errorEmbeddables.length).to.be(0);
    });

    it('should show the edit action for all panels', async () => {
      await PageObjects.dashboard.switchToEditMode();

      //   All panels should be editable. This will catch cases where an error does not create an error embeddable.
      const panelTitles = await PageObjects.dashboard.getPanelTitles();
      for (const title of panelTitles) {
        await dashboardPanelActions.expectExistsEditPanelAction(title);
      }
    });

    it('should retain all panel drilldowns from 7.12.1', async () => {
      // Both panels configured with drilldowns in 7.12.1 should still have drilldowns.
      const totalPanels = await PageObjects.dashboard.getPanelCount();
      let panelsWithDrilldowns = 0;
      for (let panelIndex = 0; panelIndex < totalPanels; panelIndex++) {
        if ((await PageObjects.dashboard.getPanelDrilldownCount(panelIndex)) === 1) {
          panelsWithDrilldowns++;
        }
      }
      expect(panelsWithDrilldowns).to.be(2);
    });
  });
}

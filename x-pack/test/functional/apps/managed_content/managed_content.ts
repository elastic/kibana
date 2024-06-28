/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'visChart',
    'timePicker',
    'lens',
    'common',
    'discover',
    'maps',
    'visualize',
    'dashboard',
  ]);
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const listingTable = getService('listingTable');
  const log = getService('log');

  // Failing: See https://github.com/elastic/kibana/issues/177551
  describe.skip('Managed Content', () => {
    before(async () => {
      esArchiver.load('x-pack/test/functional/es_archives/logstash_functional');
      kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/managed_content');
    });

    after(async () => {
      esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/managed_content');
      kibanaServer.importExport.savedObjects.clean({ types: ['dashboard'] }); // we do create a new dashboard in this test
    });

    describe('preventing the user from overwriting managed content', () => {
      const expectManagedContentSignifiers = async (
        expected: boolean,
        saveButtonTestSubject: string
      ) => {
        await testSubjects[expected ? 'existOrFail' : 'missingOrFail']('managedContentBadge');
        await testSubjects.click(saveButtonTestSubject);

        const saveAsNewCheckbox = await testSubjects.find('saveAsNewCheckbox');
        expect(await testSubjects.isEuiSwitchChecked(saveAsNewCheckbox)).to.be(expected);
        expect(await saveAsNewCheckbox.getAttribute('disabled')).to.be(expected ? 'true' : null);
      };

      it('lens', async () => {
        await PageObjects.common.navigateToActualUrl(
          'lens',
          'edit/managed-36db-4a3b-a4ba-7a64ab8f130b'
        );

        await PageObjects.lens.waitForVisualization('xyVisChart');

        await expectManagedContentSignifiers(true, 'lnsApp_saveButton');

        await PageObjects.common.navigateToActualUrl(
          'lens',
          'edit/unmanaged-36db-4a3b-a4ba-7a64ab8f130b'
        );

        await PageObjects.lens.waitForVisualization('xyVisChart');

        await expectManagedContentSignifiers(false, 'lnsApp_saveButton');
      });

      // FLAKY: https://github.com/elastic/kibana/issues/178920
      it.skip('discover', async () => {
        await PageObjects.common.navigateToActualUrl(
          'discover',
          'view/managed-3d62-4113-ac7c-de2e20a68fbc'
        );
        await PageObjects.discover.waitForDiscoverAppOnScreen();

        await expectManagedContentSignifiers(true, 'discoverSaveButton');

        await PageObjects.common.navigateToActualUrl(
          'discover',
          'view/unmanaged-3d62-4113-ac7c-de2e20a68fbc'
        );
        await PageObjects.discover.waitForDiscoverAppOnScreen();

        await expectManagedContentSignifiers(false, 'discoverSaveButton');
      });

      it('visualize', async () => {
        await PageObjects.common.navigateToActualUrl(
          'visualize',
          'edit/managed-feb9-4ba6-9538-1b8f67fb4f57'
        );
        await PageObjects.visChart.waitForVisualization();

        await expectManagedContentSignifiers(true, 'visualizeSaveButton');

        await PageObjects.common.navigateToActualUrl(
          'visualize',
          'edit/unmanaged-feb9-4ba6-9538-1b8f67fb4f57'
        );
        await PageObjects.visChart.waitForVisualization();

        await expectManagedContentSignifiers(false, 'visualizeSaveButton');
      });

      it('maps', async () => {
        await PageObjects.common.navigateToActualUrl(
          'maps',
          'map/managed-d7ab-46eb-a807-8fed28ed8566'
        );
        await PageObjects.maps.waitForLayerAddPanelClosed();

        await expectManagedContentSignifiers(true, 'mapSaveButton');

        await PageObjects.common.navigateToActualUrl(
          'maps',
          'map/unmanaged-d7ab-46eb-a807-8fed28ed8566'
        );
        await PageObjects.maps.waitForLayerAddPanelClosed();

        await expectManagedContentSignifiers(false, 'mapSaveButton');
      });
    });

    describe('library views', () => {
      const assertInspectorReadonly = async (name: string) => {
        log.debug(`making sure table list inspector for ${name} is read-only`);
        await listingTable.searchForItemWithName(name);
        await listingTable.waitUntilTableIsLoaded();
        await listingTable.inspectVisualization();
        expect(await listingTable.inspectorFieldsReadonly()).to.be(true);
        await listingTable.closeInspector();
      };

      it('visualize library: managed content is read-only', async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();

        await assertInspectorReadonly('Managed lens vis');
        await assertInspectorReadonly('Managed legacy visualization');
        await assertInspectorReadonly('Managed map');
      });
    });

    describe('managed panels in dashboards', () => {
      it('inlines panels when managed dashboard cloned', async () => {
        await PageObjects.common.navigateToActualUrl(
          'dashboard',
          'view/c44c86f9-b105-4a9c-9a24-449a58a827f3',
          // for some reason the URL didn't always match the expected, so I turned off this check
          // URL doesn't matter as long as we get the dashboard app
          { ensureCurrentUrl: false }
        );

        await PageObjects.dashboard.waitForRenderComplete();

        await PageObjects.dashboard.duplicateDashboard();

        await PageObjects.dashboard.waitForRenderComplete();

        await testSubjects.missingOrFail('embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION');
      });

      it('adds managed panels by-value', async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.clickNewDashboard();

        await dashboardAddPanel.addEmbeddables([
          { name: 'Managed lens vis', type: 'lens' },
          { name: 'Managed legacy visualization', type: 'visualization' },
          { name: 'Managed map', type: 'map' },
          { name: 'Managed saved search', type: 'search' },
        ]);

        await testSubjects.missingOrFail('embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION');

        await dashboardAddPanel.addEmbeddables([
          { name: 'Unmanaged lens vis', type: 'lens' },
          { name: 'Unmanaged legacy visualization', type: 'visualization' },
          { name: 'Unmanaged map', type: 'map' },
          { name: 'Unmanaged saved search', type: 'search' },
        ]);

        const byRefSignifiers = await testSubjects.findAll(
          'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION'
        );

        expect(byRefSignifiers.length).to.be(4);
      });
    });
  });
}

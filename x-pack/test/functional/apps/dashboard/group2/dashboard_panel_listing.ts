/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard } = getPageObjects(['dashboard']);
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('dashboard panel listing', function () {
    this.tags('skipFIPS');
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('renders a panel with predefined order of panel groups and panels', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();
      await dashboard.switchToEditMode();

      await dashboardAddPanel.clickEditorMenuButton();

      const panelSelectionList = await testSubjects.find('dashboardPanelSelectionList');

      const panelGroupByOrder = new Map();

      const panelGroups = await panelSelectionList.findAllByCssSelector(
        '[data-test-subj*="dashboardEditorMenu-"]'
      );

      const panelTypes = await panelSelectionList.findAllByCssSelector('li');

      for (let i = 0; i < panelGroups.length; i++) {
        const panelGroup = panelGroups[i];
        const order = await panelGroup.getAttribute('data-group-sort-order');
        // @ts-ignore
        const [, panelGroupTitle] = (await panelGroup.getAttribute('data-test-subj'))?.match(
          /dashboardEditorMenu-(.*)/
        );

        panelGroupByOrder.set(order, panelGroupTitle);
      }

      expect(panelGroupByOrder.size).to.eql(4);

      expect([...panelGroupByOrder.values()]).to.eql([
        'visualizationsGroup',
        'annotation-and-navigationGroup',
        'mlGroup',
        'observabilityGroup',
      ]);

      // Any changes to the number of panels needs to be audited by @elastic/kibana-presentation
      expect(panelTypes.length).to.eql(19);
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DebugState } from '@elastic/charts';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects([
    'common',
    'dashboard',
    'spaceSelector',
    'header',
    'lens',
    'timePicker',
  ]);
  const dashboardAddPanel = getService('dashboardAddPanel');
  const filterBar = getService('filterBar');
  const elasticChart = getService('elasticChart');
  const kibanaServer = getService('kibanaServer');

  function getColorMapping(debugState: DebugState | null) {
    if (!debugState) return {};
    const colorMapping: Record<string, string> = {};
    debugState.bars?.forEach(({ name, color }) => {
      colorMapping[name] = color;
    });

    return colorMapping;
  }

  // FLAKY: https://github.com/elastic/kibana/issues/97403
  describe.skip('sync colors', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
    });

    after(async function () {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
    });

    it('should sync colors on dashboard by default', async function () {
      await PageObjects.common.navigateToApp('dashboard');
      await elasticChart.setNewChartUiDebugFlag(true);
      await PageObjects.dashboard.clickCreateDashboardPrompt();
      await dashboardAddPanel.clickCreateNewLink();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'count',
        field: 'Records',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });

      await PageObjects.lens.save('vis1', false, true);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await dashboardAddPanel.clickCreateNewLink();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'count',
        field: 'Records',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });

      await filterBar.addFilter('geo.src', 'is not', 'CN');

      await PageObjects.lens.save('vis2', false, true);
      await PageObjects.header.waitUntilLoadingHasFinished();
      const colorMapping1 = getColorMapping(await PageObjects.dashboard.getPanelChartDebugState(0));
      const colorMapping2 = getColorMapping(await PageObjects.dashboard.getPanelChartDebugState(1));
      expect(Object.keys(colorMapping1)).to.have.length(6);
      expect(Object.keys(colorMapping1)).to.have.length(6);
      const panel1Keys = ['CN'];
      const panel2Keys = ['PK'];
      const sharedKeys = ['IN', 'US', 'ID', 'BR', 'Other'];
      // colors for keys exclusive to panel 1 should not occur in panel 2
      panel1Keys.forEach((panel1Key) => {
        const assignedColor = colorMapping1[panel1Key];
        expect(Object.values(colorMapping2)).not.to.contain(assignedColor);
      });
      // colors for keys exclusive to panel 2 should not occur in panel 1
      panel2Keys.forEach((panel2Key) => {
        const assignedColor = colorMapping2[panel2Key];
        expect(Object.values(colorMapping1)).not.to.contain(assignedColor);
      });
      // colors for keys used in both panels should be synced
      sharedKeys.forEach((sharedKey) => {
        expect(colorMapping1[sharedKey]).to.eql(colorMapping2[sharedKey]);
      });
    });

    it('should be possible to disable color sync', async () => {
      await PageObjects.dashboard.useColorSync(false);
      await PageObjects.header.waitUntilLoadingHasFinished();
      const colorMapping1 = getColorMapping(await PageObjects.dashboard.getPanelChartDebugState(0));
      const colorMapping2 = getColorMapping(await PageObjects.dashboard.getPanelChartDebugState(1));
      const colorsByOrder1 = Object.values(colorMapping1);
      const colorsByOrder2 = Object.values(colorMapping2);
      // colors by order of occurence have to be the same
      expect(colorsByOrder1).to.eql(colorsByOrder2);
    });
  });
}

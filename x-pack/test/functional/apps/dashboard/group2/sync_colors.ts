/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DebugState } from '@elastic/charts';
import expect from '@kbn/expect';
import chroma from 'chroma-js';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const { dashboard, header, lens } = getPageObjects(['dashboard', 'header', 'lens']);
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardSettings = getService('dashboardSettings');
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

  describe('sync colors', function () {
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
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should sync colors on dashboard for legacy default palette', async function () {
      await dashboard.navigateToApp();
      await elasticChart.setNewChartUiDebugFlag(true);
      await dashboard.clickCreateDashboardPrompt();

      // create non-filtered xy chart
      await dashboardAddPanel.clickCreateNewLink();
      await dashboard.selectIndexPattern('log*');
      await lens.goToTimeRange();
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'count',
        field: 'Records',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
        palette: { mode: 'legacy', id: 'default' },
      });
      await lens.saveAndReturn();
      await header.waitUntilLoadingHasFinished();

      // create filtered xy chart
      await dashboardAddPanel.clickCreateNewLink();
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'count',
        field: 'Records',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
        palette: { mode: 'legacy', id: 'default' },
      });
      await filterBar.addFilter({ field: 'geo.src', operation: 'is not', value: 'CN' });
      await lens.saveAndReturn();
      await header.waitUntilLoadingHasFinished();

      // create datatable vis
      await dashboardAddPanel.clickCreateNewLink();
      await lens.switchToVisualization('lnsDatatable');
      await lens.configureDimension({
        dimension: 'lnsDatatable_rows > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
        keepOpen: true,
      });
      await lens.setTermsNumberOfValues(5);
      await lens.setTableDynamicColoring('cell');
      await lens.setPalette('default', true);
      await lens.closeDimensionEditor();
      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'count',
        field: 'Records',
      });
      await lens.saveAndReturn();

      // Set dashboard to sync colors
      await dashboard.openSettingsFlyout();
      await dashboardSettings.toggleSyncColors(true);
      await dashboardSettings.clickApplyButton();
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();

      const colorMappings1 = Object.entries(
        getColorMapping(await dashboard.getPanelChartDebugState(0))
      );
      const colorMappings2 = Object.entries(
        getColorMapping(await dashboard.getPanelChartDebugState(1))
      );

      const els = await lens.getDatatableCellsByColumn(0);
      const colorMappings3 = await Promise.all(
        els.map(async (el) => [
          await el.getVisibleText(),
          chroma((await lens.getStylesFromCell(el))['background-color']).hex(), // eui converts hex to rgb
        ])
      );

      expect(colorMappings1).to.have.length(6);
      expect(colorMappings2).to.have.length(6);
      expect(colorMappings3).to.have.length(6);

      const mergedColorAssignments = new Map<string, Set<string>>();

      [...colorMappings1, ...colorMappings2, ...colorMappings3].forEach(([key, color]) => {
        if (!mergedColorAssignments.has(key)) mergedColorAssignments.set(key, new Set());
        mergedColorAssignments.get(key)?.add(color);
      });

      // Each key should have only been assigned one color across all 3 visualizations
      mergedColorAssignments.forEach((colors, key) => {
        expect(colors.size).eql(
          1,
          `Key "${key}" was assigned multiple colors: ${JSON.stringify([...colors])}`
        );
      });
    });

    it('should be possible to disable color sync', async () => {
      await dashboard.openSettingsFlyout();
      await dashboardSettings.toggleSyncColors(false);
      await dashboardSettings.clickApplyButton();
      await header.waitUntilLoadingHasFinished();
      const colorMapping1 = getColorMapping(await dashboard.getPanelChartDebugState(0));
      const colorMapping2 = getColorMapping(await dashboard.getPanelChartDebugState(1));
      const colorsByOrder1 = Object.values(colorMapping1);
      const colorsByOrder2 = Object.values(colorMapping2);
      // colors by order of occurence have to be the same
      expect(colorsByOrder1).to.eql(colorsByOrder2);
    });
  });
}

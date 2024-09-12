/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens, header } = getPageObjects(['visualize', 'lens', 'header']);
  const filterBar = getService('filterBar');
  const fieldEditor = getService('fieldEditor');
  const retry = getService('retry');
  const dataViews = getService('dataViews');

  describe('lens runtime fields', () => {
    it('should be able to add runtime field and use it', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();
      await lens.switchToVisualization('lnsDatatable');
      await retry.try(async () => {
        await dataViews.clickAddFieldFromSearchBar();
        await fieldEditor.setName('runtimefield');
        await fieldEditor.enableValue();
        await fieldEditor.typeScript("emit('abc')");
        await fieldEditor.save();
        await header.waitUntilLoadingHasFinished();
        await lens.searchField('runtime');
        await lens.waitForField('runtimefield');
        await lens.dragFieldToWorkspace('runtimefield');
      });
      await lens.waitForVisualization();
      expect(await lens.getDatatableHeaderText(0)).to.equal('Top 5 values of runtimefield');
      expect(await lens.getDatatableCellText(0, 0)).to.eql('abc');
    });

    it('should able to filter runtime fields', async () => {
      await retry.try(async () => {
        await lens.clickTableCellAction(0, 0, 'lensDatatableFilterOut');
        await lens.waitForVisualization();
        expect(await lens.isShowingNoResults()).to.equal(true);
      });
      await filterBar.removeAllFilters();
      await lens.waitForVisualization();
    });

    it('should able to edit field', async () => {
      await lens.clickField('runtimefield');
      await lens.editField('runtimefield');
      await fieldEditor.setName('runtimefield2', true, true);
      await fieldEditor.save();
      await fieldEditor.confirmSave();
      await lens.searchField('runtime');
      await lens.waitForField('runtimefield2');
      await lens.dragFieldToDimensionTrigger(
        'runtimefield2',
        'lnsDatatable_rows > lns-dimensionTrigger'
      );
      await lens.waitForVisualization();
      expect(await lens.getDatatableHeaderText(0)).to.equal('Top 5 values of runtimefield2');
      expect(await lens.getDatatableCellText(0, 0)).to.eql('abc');
    });

    it('should able to remove field', async () => {
      await lens.clickField('runtimefield2');
      await lens.removeField('runtimefield2');
      await fieldEditor.confirmDelete();
      await lens.waitForFieldMissing('runtimefield2');
    });
  });
}

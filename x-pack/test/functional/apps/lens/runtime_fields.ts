/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);
  const filterBar = getService('filterBar');
  const fieldEditor = getService('fieldEditor');
  const retry = getService('retry');

  describe('lens runtime fields', () => {
    it('should be able to add runtime field and use it', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      await retry.try(async () => {
        await PageObjects.lens.clickAddField();
        await fieldEditor.setName('runtimefield');
        await fieldEditor.enableValue();
        await fieldEditor.typeScript("emit('abc')");
        await fieldEditor.save();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.lens.searchField('runtime');
        await PageObjects.lens.waitForField('runtimefield');
        await PageObjects.lens.dragFieldToWorkspace('runtimefield');
      });
      await PageObjects.lens.waitForVisualization();
      expect(await PageObjects.lens.getDatatableHeaderText(0)).to.equal(
        'Top values of runtimefield'
      );
      expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('abc');
    });

    it('should able to filter runtime fields', async () => {
      await retry.try(async () => {
        await PageObjects.lens.clickTableCellAction(0, 0, 'lensDatatableFilterOut');
        await PageObjects.lens.waitForVisualization();
        expect(await PageObjects.lens.isShowingNoResults()).to.equal(true);
      });
      await filterBar.removeAllFilters();
      await PageObjects.lens.waitForVisualization();
    });

    it('should able to edit field', async () => {
      await PageObjects.lens.clickField('runtimefield');
      await PageObjects.lens.editField();
      await fieldEditor.setName('runtimefield2', true, true);
      await fieldEditor.save();
      await fieldEditor.confirmSave();
      await PageObjects.lens.searchField('runtime');
      await PageObjects.lens.waitForField('runtimefield2');
      await PageObjects.lens.dragFieldToDimensionTrigger(
        'runtimefield2',
        'lnsDatatable_rows > lns-dimensionTrigger'
      );
      await PageObjects.lens.waitForVisualization();
      expect(await PageObjects.lens.getDatatableHeaderText(0)).to.equal(
        'Top values of runtimefield2'
      );
      expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('abc');
    });

    it('should able to remove field', async () => {
      await PageObjects.lens.clickField('runtimefield2');
      await PageObjects.lens.removeField();
      await fieldEditor.confirmDelete();
      await PageObjects.lens.waitForFieldMissing('runtimefield2');
    });
  });
}

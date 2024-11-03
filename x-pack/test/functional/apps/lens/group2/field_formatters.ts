/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens, header } = getPageObjects(['visualize', 'lens', 'header']);
  const retry = getService('retry');
  const fieldEditor = getService('fieldEditor');
  const dataViews = getService('dataViews');

  describe('lens fields formatters tests', () => {
    describe('keyword formatters', () => {
      before(async () => {
        await visualize.navigateToNewVisualization();
        await visualize.clickVisType('lens');
        await lens.goToTimeRange();
        await lens.switchToVisualization('lnsDatatable');
      });

      after(async () => {
        await lens.clickField('runtimefield');
        await lens.removeField('runtimefield');
        await fieldEditor.confirmDelete();
        await lens.waitForFieldMissing('runtimefield');
      });
      it('should display url formatter correctly', async () => {
        await retry.try(async () => {
          await dataViews.clickAddFieldFromSearchBar();
          await fieldEditor.setName('runtimefield');
          await fieldEditor.enableValue();
          await fieldEditor.typeScript("emit(doc['geo.dest'].value)");
          await fieldEditor.setFormat(FIELD_FORMAT_IDS.URL);
          await fieldEditor.setUrlFieldFormat('https://www.elastic.co?{{value}}');
          await fieldEditor.save();
          await fieldEditor.waitUntilClosed();
          await header.waitUntilLoadingHasFinished();
          await lens.searchField('runtime');
          await lens.waitForField('runtimefield');
          await lens.dragFieldToWorkspace('runtimefield');
        });
        await lens.waitForVisualization();
        expect(await lens.getDatatableHeaderText(0)).to.equal('Top 5 values of runtimefield');
        expect(await lens.getDatatableCellText(0, 0)).to.eql('https://www.elastic.co?CN');
      });

      it('should display static lookup formatter correctly', async () => {
        await retry.try(async () => {
          await lens.clickField('runtimefield');
          await lens.editField('runtimefield');
          await fieldEditor.setFormat(FIELD_FORMAT_IDS.STATIC_LOOKUP);
          await fieldEditor.setStaticLookupFormat('CN', 'China');
          await fieldEditor.save();
          await fieldEditor.waitUntilClosed();
          await header.waitUntilLoadingHasFinished();
        });
        await lens.waitForVisualization();
        expect(await lens.getDatatableCellText(0, 0)).to.eql('China');
      });

      it('should display color formatter correctly', async () => {
        await retry.try(async () => {
          await lens.clickField('runtimefield');
          await lens.editField('runtimefield');
          await fieldEditor.setFormat(FIELD_FORMAT_IDS.COLOR);
          await fieldEditor.setColorFormat('CN', '#ffffff', '#ff0000');
          await fieldEditor.save();
          await fieldEditor.waitUntilClosed();
          await header.waitUntilLoadingHasFinished();
        });
        await lens.waitForVisualization();
        const styleObj = await lens.getDatatableCellSpanStyle(0, 0);
        expect(styleObj['background-color']).to.be('rgb(255, 0, 0)');
        expect(styleObj.color).to.be('rgb(255, 255, 255)');
      });

      it('should display string formatter correctly', async () => {
        await retry.try(async () => {
          await lens.clickField('runtimefield');
          await lens.editField('runtimefield');
          await fieldEditor.setFormat(FIELD_FORMAT_IDS.STRING);
          await fieldEditor.setStringFormat('lower');
          await fieldEditor.save();
          await fieldEditor.waitUntilClosed();
          await header.waitUntilLoadingHasFinished();
        });
        await lens.waitForVisualization();
        expect(await lens.getDatatableCellText(0, 0)).to.eql('cn');
      });

      it('should display truncate string formatter correctly', async () => {
        await retry.try(async () => {
          await lens.clickField('runtimefield');
          await lens.editField('runtimefield');
          await fieldEditor.clearScript();
          await fieldEditor.typeScript("emit(doc['links.raw'].value)");
          await fieldEditor.setFormat(FIELD_FORMAT_IDS.TRUNCATE);
          await fieldEditor.setTruncateFormatLength('3');
          await fieldEditor.save();
          await fieldEditor.waitUntilClosed();
          await header.waitUntilLoadingHasFinished();
        });
        await lens.waitForVisualization();
        expect(await lens.getDatatableCellText(0, 0)).to.eql('dal...');
      });
    });

    describe('number formatters', () => {
      before(async () => {
        await visualize.navigateToNewVisualization();
        await visualize.clickVisType('lens');
        await lens.goToTimeRange();
        await lens.switchToVisualization('lnsDatatable');
      });

      after(async () => {
        await lens.clickField('runtimefield');
        await lens.removeField('runtimefield');
        await fieldEditor.confirmDelete();
        await lens.waitForFieldMissing('runtimefield');
      });
      it('should display bytes number formatter correctly', async () => {
        await retry.try(async () => {
          await dataViews.clickAddFieldFromSearchBar();
          await fieldEditor.setName('runtimefield');
          await fieldEditor.setFieldType('long');
          await fieldEditor.enableValue();
          await fieldEditor.typeScript("emit(doc['bytes'].value)");
          await fieldEditor.setFormat(FIELD_FORMAT_IDS.BYTES);
          await fieldEditor.save();
          await fieldEditor.waitUntilClosed();
          await header.waitUntilLoadingHasFinished();
          await lens.configureDimension({
            dimension: 'lnsDatatable_metrics > lns-empty-dimension',
            operation: 'average',
            field: 'runtimefield',
          });
        });
        await lens.waitForVisualization();
        expect(await lens.getDatatableCellText(0, 0)).to.eql('5.6KB');
      });

      it('should display currency number formatter correctly', async () => {
        await retry.try(async () => {
          await lens.clickField('runtimefield');
          await lens.editField('runtimefield');
          await fieldEditor.setFormat(FIELD_FORMAT_IDS.CURRENCY);
          await fieldEditor.save();
          await fieldEditor.waitUntilClosed();
          await header.waitUntilLoadingHasFinished();
        });
        await lens.waitForVisualization();
        expect(await lens.getDatatableCellText(0, 0)).to.eql('$5,727.32');
      });

      it('should display duration number formatter correctly', async () => {
        await retry.try(async () => {
          await lens.clickField('runtimefield');
          await lens.editField('runtimefield');
          await fieldEditor.setFormat(FIELD_FORMAT_IDS.DURATION);
          await fieldEditor.save();
          await fieldEditor.waitUntilClosed();
          await header.waitUntilLoadingHasFinished();
        });
        await lens.waitForVisualization();
        expect(await lens.getDatatableCellText(0, 0)).to.eql('2 hours');
      });

      it('should display percentage number formatter correctly', async () => {
        await retry.try(async () => {
          await lens.clickField('runtimefield');
          await lens.editField('runtimefield');
          await fieldEditor.setFormat(FIELD_FORMAT_IDS.PERCENT);
          await fieldEditor.save();
          await fieldEditor.waitUntilClosed();
          await header.waitUntilLoadingHasFinished();
        });
        await lens.waitForVisualization();
        expect(await lens.getDatatableCellText(0, 0)).to.eql('572,732.21%');
      });
    });
    describe('formatter order', () => {
      before(async () => {
        await visualize.navigateToNewVisualization();
        await visualize.clickVisType('lens');
        await lens.goToTimeRange();
        await lens.switchToVisualization('lnsDatatable');
      });

      after(async () => {
        await lens.clickField('runtimefield');
        await lens.removeField('runtimefield');
        await fieldEditor.confirmDelete();
        await lens.waitForFieldMissing('runtimefield');
      });
      it('should be overridden by Lens formatter', async () => {
        await retry.try(async () => {
          await dataViews.clickAddFieldFromSearchBar();
          await fieldEditor.setName('runtimefield');
          await fieldEditor.setFieldType('long');
          await fieldEditor.enableValue();
          await fieldEditor.typeScript("emit(doc['bytes'].value)");
          await fieldEditor.setFormat(FIELD_FORMAT_IDS.BYTES);
          await fieldEditor.save();
          await fieldEditor.waitUntilClosed();
          await header.waitUntilLoadingHasFinished();
        });
        await lens.configureDimension({
          dimension: 'lnsDatatable_metrics > lns-empty-dimension',
          operation: 'average',
          field: 'runtimefield',
          keepOpen: true,
        });
        await lens.editDimensionFormat('Bits (1000)', { decimals: 3, prefix: 'blah' });
        await lens.closeDimensionEditor();
        await lens.waitForVisualization();
        expect(await lens.getDatatableCellText(0, 0)).to.eql('5.727kbitblah');
      });
    });
  });
}

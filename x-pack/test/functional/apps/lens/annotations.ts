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
  const find = getService('find');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  describe('lens annotations tests', () => {
    it('should show a disabled annotation layer button if there is no date histogram in data layer', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.dragFieldToWorkspace('geo.src', 'xyVisChart');
      await testSubjects.click('lnsLayerAddButton');
      await retry.waitFor('wait for layer popup to appear', async () =>
        testSubjects.exists(`lnsLayerAddButton-annotations`)
      );
      expect(
        await (await testSubjects.find(`lnsLayerAddButton-annotations`)).getAttribute('disabled')
      ).to.be('true');
    });

    it('should add manual annotation layer with static date and allow edition', async () => {
      await PageObjects.lens.removeLayer();
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.dragFieldToWorkspace('@timestamp', 'xyVisChart');

      await PageObjects.lens.createLayer('annotations');

      expect((await find.allByCssSelector(`[data-test-subj^="lns-layerPanel-"]`)).length).to.eql(2);
      expect(
        await (
          await testSubjects.find('lnsXY_xAnnotationsPanel > lns-dimensionTrigger')
        ).getVisibleText()
      ).to.eql('Event');
      await testSubjects.click('lnsXY_xAnnotationsPanel > lns-dimensionTrigger');
      await testSubjects.click('lnsXY_textVisibility_name');
      await PageObjects.lens.closeDimensionEditor();

      await testSubjects.existOrFail('xyVisAnnotationIcon');
      await testSubjects.existOrFail('xyVisAnnotationText');
    });

    it('should duplicate the style when duplicating an annotation and group them in the chart', async () => {
      // drag and drop to the empty field to generate a duplicate
      await PageObjects.lens.dragDimensionToDimension(
        'lnsXY_xAnnotationsPanel > lns-dimensionTrigger',
        'lnsXY_xAnnotationsPanel > lns-empty-dimension'
      );

      await (
        await find.byCssSelector(
          '[data-test-subj="lnsXY_xAnnotationsPanel"]:nth-child(2) [data-test-subj="lns-dimensionTrigger"]'
        )
      ).click();
      expect(
        await find.existsByCssSelector(
          '[data-test-subj="lnsXY_textVisibility_name"][class$="isSelected"]'
        )
      ).to.be(true);
      await PageObjects.lens.closeDimensionEditor();
      await testSubjects.existOrFail('xyVisAnnotationText');
      await testSubjects.existOrFail('xyVisGroupedAnnotationIcon');
    });
  });
}

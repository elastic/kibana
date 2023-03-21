/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);
  const find = getService('find');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const from = 'Sep 19, 2015 @ 06:31:44.000';
  const to = 'Sep 23, 2015 @ 18:31:44.000';

  describe('lens annotations tests', () => {
    before(async () => {
      await PageObjects.common.setTime({ from, to });
    });
    after(async () => {
      await PageObjects.common.unsetTime();
    });

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
      await PageObjects.lens.dragDimensionToDimension({
        from: 'lnsXY_xAnnotationsPanel > lns-dimensionTrigger',
        to: 'lnsXY_xAnnotationsPanel > lns-empty-dimension',
      });

      await (
        await find.byCssSelector(
          '[data-test-subj="lnsXY_xAnnotationsPanel"]:nth-child(2) [data-test-subj="lns-dimensionTrigger"]'
        )
      ).click();
      expect(
        await find.existsByCssSelector(
          '[data-test-subj="lnsXY_textVisibility_name"][class*="euiButtonGroupButton-isSelected"]'
        )
      ).to.be(true);
      await PageObjects.lens.closeDimensionEditor();
      await testSubjects.existOrFail('xyVisGroupedAnnotationIcon');
    });

    it('should add query annotation layer and allow edition', async () => {
      await PageObjects.lens.removeLayer(1);
      await PageObjects.lens.createLayer('annotations');

      expect((await find.allByCssSelector(`[data-test-subj^="lns-layerPanel-"]`)).length).to.eql(2);
      expect(
        await (
          await testSubjects.find('lnsXY_xAnnotationsPanel > lns-dimensionTrigger')
        ).getVisibleText()
      ).to.eql('Event');
      await testSubjects.click('lnsXY_xAnnotationsPanel > lns-dimensionTrigger');
      await testSubjects.click('lnsXY_annotation_query');
      await PageObjects.lens.configureQueryAnnotation({
        queryString: '*',
        timeField: 'utc_time',
        textDecoration: { type: 'name' },
        extraFields: ['clientip'],
      });
      await PageObjects.lens.closeDimensionEditor();

      await testSubjects.existOrFail('xyVisGroupedAnnotationIcon');
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens, common, tagManagement } = getPageObjects([
    'visualize',
    'lens',
    'common',
    'tagManagement',
  ]);
  const find = getService('find');
  const retry = getService('retry');
  const toastsService = getService('toasts');
  const testSubjects = getService('testSubjects');
  const listingTable = getService('listingTable');
  const from = 'Sep 19, 2015 @ 06:31:44.000';
  const to = 'Sep 23, 2015 @ 18:31:44.000';

  describe('lens annotations tests', () => {
    before(async () => {
      await common.setTime({ from, to });
    });
    after(async () => {
      await common.unsetTime();
    });

    it('should show a disabled annotation layer button if there is no date histogram in data layer', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.dragFieldToWorkspace('geo.src', 'xyVisChart');
      await testSubjects.click('lnsLayerAddButton');
      await retry.waitFor('wait for layer popup to appear', async () =>
        testSubjects.exists(`lnsLayerAddButton-annotations`)
      );
      expect(
        await (await testSubjects.find(`lnsLayerAddButton-annotations`)).getAttribute('disabled')
      ).to.be('true');
    });

    it('should add manual annotation layer with static date and allow edition', async () => {
      await lens.removeLayer();
      await lens.goToTimeRange();
      await lens.dragFieldToWorkspace('@timestamp', 'xyVisChart');

      await lens.createLayer('annotations');

      expect((await find.allByCssSelector(`[data-test-subj^="lns-layerPanel-"]`)).length).to.eql(2);
      expect(
        await (
          await testSubjects.find('lnsXY_xAnnotationsPanel > lns-dimensionTrigger')
        ).getVisibleText()
      ).to.eql('Event');
      await testSubjects.click('lnsXY_xAnnotationsPanel > lns-dimensionTrigger');
      await testSubjects.click('lnsXY_textVisibility_name');
      await lens.closeDimensionEditor();

      await testSubjects.existOrFail('xyVisAnnotationIcon');
      await testSubjects.existOrFail('xyVisAnnotationText');
    });

    it('should duplicate the style when duplicating an annotation and group them in the chart', async () => {
      // drag and drop to the empty field to generate a duplicate
      await lens.dragDimensionToDimension({
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
      await lens.closeDimensionEditor();
      await testSubjects.existOrFail('xyVisGroupedAnnotationIcon');
    });

    it('should add query annotation layer and allow edition', async () => {
      await lens.removeLayer(1);
      await lens.createLayer('annotations');

      expect((await find.allByCssSelector(`[data-test-subj^="lns-layerPanel-"]`)).length).to.eql(2);
      expect(
        await (
          await testSubjects.find('lnsXY_xAnnotationsPanel > lns-dimensionTrigger')
        ).getVisibleText()
      ).to.eql('Event');
      await testSubjects.click('lnsXY_xAnnotationsPanel > lns-dimensionTrigger');
      await testSubjects.click('lnsXY_annotation_query');
      await lens.configureQueryAnnotation({
        queryString: '*',
        timeField: 'utc_time',
        textDecoration: { type: 'name' },
        extraFields: ['clientip'],
      });
      await lens.closeDimensionEditor();

      await testSubjects.existOrFail('xyVisGroupedAnnotationIcon');
    });

    describe('library annotation groups', () => {
      const ANNOTATION_GROUP_TITLE = 'library annotation group';
      const FIRST_VIS_TITLE = 'first visualization';
      const SECOND_VIS_TITLE = 'second visualization';

      it('should save annotation group to library', async () => {
        await visualize.navigateToNewVisualization();
        await visualize.clickVisType('lens');

        await lens.goToTimeRange();
        await lens.dragFieldToWorkspace('@timestamp', 'xyVisChart');

        await lens.createLayer('annotations');

        await lens.performLayerAction('lnsXY_annotationLayer_saveToLibrary', 1);

        await visualize.setSaveModalValues(ANNOTATION_GROUP_TITLE, {
          description: 'my description',
        });

        await testSubjects.click('savedObjectTagSelector');
        await testSubjects.click(`tagSelectorOption-action__create`);

        const { tagModal } = tagManagement;

        expect(await tagModal.isOpened()).to.be(true);

        await tagModal.fillForm(
          {
            name: 'my-new-tag',
            color: '#FFCC33',
            description: '',
          },
          {
            submit: true,
            clearWithKeyboard: true,
          }
        );

        expect(await tagModal.isOpened()).to.be(false);

        await testSubjects.click('confirmSaveSavedObjectButton');

        const toastContents = await toastsService.getContentByIndex(1);

        expect(toastContents).to.be(
          `Saved "${ANNOTATION_GROUP_TITLE}"\nView or manage in the annotation library.`
        );

        await lens.save(FIRST_VIS_TITLE);

        // TODO test that saved object info gets populated on subsequent save
      });

      it('should add annotation group from library', async () => {
        await visualize.navigateToNewVisualization();
        await visualize.clickVisType('lens');

        await lens.goToTimeRange();
        await lens.dragFieldToWorkspace('@timestamp', 'xyVisChart');

        await lens.createLayer('annotations', ANNOTATION_GROUP_TITLE);

        await retry.try(async () => {
          expect(await lens.getLayerCount()).to.be(2);
        });

        await lens.save(SECOND_VIS_TITLE);
      });

      it('should remove layer for deleted annotation group', async () => {
        await visualize.gotoVisualizationLandingPage();
        await visualize.selectAnnotationsTab();
        await listingTable.deleteItem(ANNOTATION_GROUP_TITLE);
        await visualize.selectVisualizationsTab();
        await visualize.loadSavedVisualization(FIRST_VIS_TITLE, {
          navigateToVisualize: false,
        });

        await retry.try(async () => {
          expect(await lens.getLayerCount()).to.be(1);
        });
      });

      // TODO check various saving configurations (linked layer, clean by-ref, revert)

      // TODO check annotation library, including delete flow
    });
  });
}

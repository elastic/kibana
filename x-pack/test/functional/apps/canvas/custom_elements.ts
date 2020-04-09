/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function canvasCustomElementTest({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['canvas', 'common']);
  const find = getService('find');

  // FLAKY: https://github.com/elastic/kibana/issues/62927
  describe.skip('custom elements', function() {
    this.tags('skipFirefox');

    before(async () => {
      // init data
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('canvas/default');

      // open canvas home
      await PageObjects.common.navigateToApp('canvas');

      // load test workpad
      await PageObjects.common.navigateToApp('canvas', {
        hash: '/workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31/page/1',
      });
    });

    it('creates a custom element from an element when prompted', async () => {
      // find the first workpad element (a markdown element) and click it to select it
      await testSubjects.click('canvasWorkpadPage > canvasWorkpadPageElementContent', 20000);

      // click the "Save as new element" button
      await find.clickByCssSelector('[aria-label="Save as new element"]', 20000);

      // fill out the custom element form and submit it
      await PageObjects.canvas.fillOutCustomElementForm(
        'My New Element',
        'An excellent new element'
      );

      // wait for the custom element success toast notif
      await testSubjects.exists('canvasCustomElementCreate-success', {
        timeout: 30000,
      });
    });

    // https://github.com/elastic/kibana/issues/63339
    it.skip('adds the custom element to the workpad when prompted', async () => {
      await PageObjects.canvas.openAddElementModal();

      // open the custom elements tab
      await find.clickByCssSelector('#customElements', 20000);

      // ensure the custom element is the one expected and click it to add to the workpad
      const customElement = await find.byCssSelector(
        '[aria-labelledby="customElements"] .canvasElementCard__wrapper'
      );
      const elementName = await customElement.findByCssSelector('.euiCard__title');
      expect(await elementName.getVisibleText()).to.contain('My New Element');
      customElement.click();

      await retry.try(async () => {
        // ensure the new element is on the workpad
        const elements = await testSubjects.findAll(
          'canvasWorkpadPage > canvasWorkpadPageElementContent'
        );
        expect(elements).to.have.length(5);

        // ensure the new element has the expected content
        const newElem = elements[4];
        const md = await newElem.findByCssSelector('.canvasMarkdown');
        expect(await md.getVisibleText()).to.contain('Welcome to Canvas');

        // delete the element off the workpad
        await newElem.click();
        await browser.pressKeys(browser.keys.DELETE);

        // ensure the new element has been removed
        const elementsAgain = await testSubjects.findAll(
          'canvasWorkpadPage > canvasWorkpadPageElementContent'
        );
        expect(elementsAgain).to.have.length(4);
      });
    });

    it('saves custom element modifications', async () => {
      await PageObjects.canvas.openAddElementModal();

      // open the custom elements tab
      await find.clickByCssSelector('#customElements', 20000);

      // ensure the correct amount of custom elements exist
      const container = await find.byCssSelector('[aria-labelledby="customElements"]');
      const customElements = await container.findAllByCssSelector('.canvasElementCard__wrapper');
      expect(customElements).to.have.length(1);

      // hover over the custom element to bring up the edit and delete icons
      const customElement = customElements[0];
      await customElement.moveMouseTo();

      // click the edit element button
      const editBtn = await customElement.findByCssSelector('[aria-label="Edit element"]');
      await editBtn.click();

      // fill out the custom element form and submit it
      await PageObjects.canvas.fillOutCustomElementForm(
        'My Edited New Element',
        'An excellent edited element'
      );

      // ensure the custom element in the modal shows the updated text
      await retry.try(async () => {
        const elementName = await find.byCssSelector(
          '[aria-labelledby="customElements"] .canvasElementCard__wrapper .euiCard__title'
        );

        expect(await elementName.getVisibleText()).to.contain('My Edited New Element');
      });
    });

    it('deletes custom element when prompted', async () => {
      // open the custom elements tab
      await find.clickByCssSelector('#customElements', 20000);

      // ensure the correct amount of custom elements exist
      const customElements = await find.allByCssSelector(
        '[aria-labelledby="customElements"] .canvasElementCard__wrapper'
      );
      expect(customElements).to.have.length(1);

      // hover over the custom element to bring up the edit and delete icons
      const customElement = customElements[0];
      await customElement.moveMouseTo();

      // click the delete element button
      const editBtn = await customElement.findByCssSelector('[aria-label="Delete element"]');
      await editBtn.click();

      await testSubjects.click('confirmModalConfirmButton');

      // ensure the custom element was deleted
      await retry.try(async () => {
        const containerAgain = await find.byCssSelector('[aria-labelledby="customElements"]');
        const customElementsAgain = await containerAgain.findAllByCssSelector(
          '.canvasElementCard__wrapper'
        );
        expect(customElementsAgain).to.have.length(0);
      });

      // Close the modal
      await browser.pressKeys(browser.keys.ESCAPE);
    });
  });
}

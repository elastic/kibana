/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({
  getPageObjects,
  getService,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const pageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const screenshot = getService('screenshots');
  const find = getService('find');
  const browser = getService('browser');

  describe('Resolver test app', function () {
    this.tags('ciGroup7');

    beforeEach(async function () {
      await pageObjects.common.navigateToApp('resolverTest');
    });

    it('renders at least one node, one node-list, one edge line, and graph controls', async function () {
      await testSubjects.existOrFail('resolver:node');
      await testSubjects.existOrFail('resolver:node-list');
      await testSubjects.existOrFail('resolver:graph:edgeline');
      await testSubjects.existOrFail('resolver:graph-controls');

      // stuff i'd like to test
      // nodes: short name origin node with 13 pills, long name non-origin node, short name non-origin node
      // node states: node is selected, node is unselected
      // interaction states: node button is hovered, node button is focused, node button is hovered and focused, pill is focused, pill is hovered, pill is hovered and focused

      // make the window big enough that all nodes are fully in view (for screenshots)
      await browser.setWindowSize(1920, 1200);

      // Because the lint rules will not allow files that include upper case characters, we specify explicit file name prefixes
      const nodeDefinitions: Array<[nodeID: string, fileNamePrefix: string]> = [
        ['origin', 'origin'],
        ['firstChild', 'first_child'],
        ['secondChild', 'second_child'],
      ];

      for (const [nodeID, fileNamePrefix] of nodeDefinitions) {
        const element = await find.byCssSelector(`[data-test-resolver-node-id="${nodeID}"]`);
        await screenshot.compareAgainstBaseline(`${fileNamePrefix}`, updateBaselines, element);
        // hover the button
        const button = await element.findByCssSelector(
          `button[data-test-resolver-node-id="${nodeID}"]`
        );
        await button.moveMouseTo();
        await screenshot.compareAgainstBaseline(
          `${fileNamePrefix}_with_primary_button_hovered`,
          updateBaselines,
          element
        );

        // select the node
        await button.click();
        await screenshot.compareAgainstBaseline(
          `${fileNamePrefix}_selected_with_primary_button_hovered`,
          updateBaselines,
          element
        );

        // move the mouse away
        const zoomIn = await testSubjects.find('resolver:graph-controls:zoom-in');
        await zoomIn.moveMouseTo();

        await screenshot.compareAgainstBaseline(
          `${fileNamePrefix}_selected`,
          updateBaselines,
          element
        );

        // select a pill
        const pills = await element.findAllByTestSubject('resolver:map:node-submenu-item');

        if (pills.length) {
          const [firstPill] = pills;
          // move mouse to first pill
          await firstPill.moveMouseTo();

          await screenshot.compareAgainstBaseline(
            `${fileNamePrefix}_selected_with_first_pill_hovered`,
            updateBaselines,
            element
          );

          // click the first pill
          await firstPill.click();

          await screenshot.compareAgainstBaseline(
            `${fileNamePrefix}_selected_with_first_pill_selected`,
            updateBaselines,
            element
          );
        }
      }
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { panAnimationDuration } from '@kbn/security-solution-plugin/public/resolver/store/camera/scaling_constants';
import { WebElementWrapper } from '../../../../../test/functional/services/lib/web_element_wrapper';

import { FtrProviderContext } from '../../ftr_provider_context';

const expectedDifference = 0.09;

const waitForPanAnimationToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, panAnimationDuration + 1));

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

  // FLAKY: https://github.com/elastic/kibana/issues/87425
  describe('Resolver test app', function () {
    this.tags('ciGroup7');

    // Note: these tests are intended to run on the same page in serial.
    before(async function () {
      await pageObjects.common.navigateToApp('resolverTest');
      // make the window big enough that all nodes are fully in view (for screenshots)
      await browser.setScreenshotSize(3840, 2400);
    });

    it('renders at least one node', async () => {
      await testSubjects.existOrFail('resolver:node');
    });
    it('renders a node list', async () => {
      await testSubjects.existOrFail('resolver:node-list');
    });
    it('renders at least one edge line', async () => {
      await testSubjects.existOrFail('resolver:graph:edgeline');
    });
    it('renders graph controls', async () => {
      await testSubjects.existOrFail('resolver:graph-controls');
    });
    /**
     * The mock data used to render the Resolver test plugin has 3 nodes:
     *   - an origin node with 13 related event pills
     *   - a non-origin node with a long name
     *   - a non-origin node with a short name
     *
     * Each node is captured when selected and unselected.
     *
     * For each node is captured (once when selected and once when unselected) in each of the following interaction states:
     *   - primary button hovered
     *   - pill is hovered
     *   - pill is clicked
     *   - pill is clicked and hovered
     */

    // Because the lint rules will not allow files that include upper case characters, we specify explicit file name prefixes
    const nodeDefinitions: Array<[nodeID: string, fileNamePrefix: string, hasAPill: boolean]> = [
      ['origin', 'origin', true],
      ['firstChild', 'first_child', false],
      ['secondChild', 'second_child', false],
    ];

    for (const [nodeID, fileNamePrefix, hasAPill] of nodeDefinitions) {
      describe(`when the user is interacting with the node with ID: ${nodeID}`, () => {
        let element: () => Promise<WebElementWrapper>;
        beforeEach(async () => {
          element = () => find.byCssSelector(`[data-test-resolver-node-id="${nodeID}"]`);
        });
        it('should render as expected', async () => {
          expect(
            await screenshot.compareAgainstBaseline(
              `${fileNamePrefix}`,
              updateBaselines,
              await element()
            )
          ).to.be.lessThan(expectedDifference);
        });
        describe('when the user hovers over the primary button', () => {
          let button: WebElementWrapper;
          beforeEach(async () => {
            // hover the button
            button = await (
              await element()
            ).findByCssSelector(`button[data-test-resolver-node-id="${nodeID}"]`);
            await button.moveMouseTo();
          });
          it('should render as expected', async () => {
            expect(
              await screenshot.compareAgainstBaseline(
                `${fileNamePrefix}_with_primary_button_hovered`,
                updateBaselines,
                await element()
              )
            ).to.be.lessThan(expectedDifference);
          });
          describe('when the user has clicked the primary button (which selects the node.)', () => {
            beforeEach(async () => {
              // select the node
              await button.click();
              // Wait for the pan to center the node
              await waitForPanAnimationToFinish();
            });
            it('should render as expected', async () => {
              expect(
                await screenshot.compareAgainstBaseline(
                  `${fileNamePrefix}_selected_with_primary_button_hovered`,
                  updateBaselines,
                  await element()
                )
              ).to.be.lessThan(expectedDifference);
            });
            describe('when the user has moved their mouse off of the primary button (and onto the zoom controls.)', () => {
              beforeEach(async () => {
                // move the mouse away
                const zoomIn = await testSubjects.find('resolver:graph-controls:zoom-in');
                await zoomIn.moveMouseTo();
              });
              it('should render as expected', async () => {
                expect(
                  await screenshot.compareAgainstBaseline(
                    `${fileNamePrefix}_selected`,
                    updateBaselines,
                    await element()
                  )
                ).to.be.lessThan(expectedDifference);
              });
              if (hasAPill) {
                describe('when the user hovers over the first pill', () => {
                  let firstPill: () => Promise<WebElementWrapper>;
                  beforeEach(async () => {
                    firstPill = async () => {
                      // select a pill
                      const pills = await (
                        await element()
                      ).findAllByTestSubject('resolver:map:node-submenu-item');
                      return pills[0];
                    };

                    // move mouse to first pill
                    await (await firstPill()).moveMouseTo();
                  });
                  it('should render as expected', async () => {
                    const diff = await screenshot.compareAgainstBaseline(
                      `${fileNamePrefix}_selected_with_first_pill_hovered`,
                      updateBaselines,
                      await element()
                    );
                    expect(diff).to.be.lessThan(expectedDifference);
                  });
                  describe('when the user clicks on the first pill', () => {
                    beforeEach(async () => {
                      // click the first pill
                      await (await firstPill()).click();

                      // Wait for the pan to center the node
                      await waitForPanAnimationToFinish();
                    });
                    it('should render as expected', async () => {
                      expect(
                        await screenshot.compareAgainstBaseline(
                          `${fileNamePrefix}_selected_with_first_pill_selected`,
                          updateBaselines,
                          await element()
                        )
                      ).to.be.lessThan(expectedDifference);
                    });
                  });
                });
              }
            });
          });
        });
      });
    }
  });
}

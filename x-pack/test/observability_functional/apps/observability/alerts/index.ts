/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

async function asyncForEach<T>(array: T[], callback: (item: T, index: number) => void) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index);
  }
}

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');

  // Failing: See https://github.com/elastic/kibana/issues/111907
  describe.skip('Observability alerts', function () {
    this.tags('includeFirefox');

    const pageObjects = getPageObjects(['common']);
    const testSubjects = getService('testSubjects');
    const retry = getService('retry');
    const observability = getService('observability');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await observability.alerts.navigateToTimeWithData();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    describe('Alerts table', () => {
      it('Renders the table', async () => {
        await observability.alerts.getTableOrFail();
      });

      it('Renders the correct number of cells', async () => {
        // NOTE: This isn't ideal, but EuiDataGrid doesn't really have the concept of "rows"
        const cells = await observability.alerts.getTableCells();
        expect(cells.length).to.be(72);
      });

      describe('Filtering', () => {
        afterEach(async () => {
          await observability.alerts.clearQueryBar();
        });

        after(async () => {
          // NOTE: We do this as the query bar takes the place of the datepicker when it is in focus, so we'll reset
          // back to default.
          await observability.alerts.submitQuery('');
        });

        it('Autocompletion works', async () => {
          await observability.alerts.typeInQueryBar('kibana.alert.s');
          await testSubjects.existOrFail('autocompleteSuggestion-field-kibana.alert.start-');
          await testSubjects.existOrFail('autocompleteSuggestion-field-kibana.alert.status-');
        });

        it('Applies filters correctly', async () => {
          await observability.alerts.submitQuery('kibana.alert.status: recovered');
          await retry.try(async () => {
            const cells = await observability.alerts.getTableCells();
            expect(cells.length).to.be(24);
          });
        });

        it('Displays a no data state when filters produce zero results', async () => {
          await observability.alerts.submitQuery('kibana.alert.consumer: uptime');
          await observability.alerts.getNoDataStateOrFail();
        });
      });

      describe('Date selection', () => {
        after(async () => {
          await observability.alerts.navigateToTimeWithData();
        });

        it('Correctly applies date picker selections', async () => {
          await retry.try(async () => {
            await (await testSubjects.find('superDatePickerToggleQuickMenuButton')).click();
            // We shouldn't expect any data for the last 15 minutes
            await (await testSubjects.find('superDatePickerCommonlyUsed_Last_15 minutes')).click();
          });
          await observability.alerts.getNoDataStateOrFail();
          await pageObjects.common.waitUntilUrlIncludes('rangeFrom=now-15m&rangeTo=now');
        });
      });

      describe('Flyout', () => {
        it('Can be opened', async () => {
          await observability.alerts.openAlertsFlyout();
          await observability.alerts.getAlertsFlyoutOrFail();
        });

        it('Can be closed', async () => {
          await observability.alerts.closeAlertsFlyout();
          await testSubjects.missingOrFail('alertsFlyout');
        });

        describe('When open', async () => {
          before(async () => {
            await observability.alerts.openAlertsFlyout();
          });

          after(async () => {
            await observability.alerts.closeAlertsFlyout();
          });

          it('Displays the correct title', async () => {
            const titleText = await (
              await observability.alerts.getAlertsFlyoutTitle()
            ).getVisibleText();
            expect(titleText).to.contain('Log threshold');
          });

          it('Displays the correct content', async () => {
            const flyoutTitles = await observability.alerts.getAlertsFlyoutDescriptionListTitles();
            const flyoutDescriptions =
              await observability.alerts.getAlertsFlyoutDescriptionListDescriptions();

            const expectedTitles = [
              'Status',
              'Last updated',
              'Duration',
              'Expected value',
              'Actual value',
              'Rule type',
            ];
            const expectedDescriptions = [
              'Active',
              'Sep 2, 2021 @ 12:54:09.674',
              '15 minutes',
              '100.25',
              '1957',
              'Log threshold',
            ];

            await asyncForEach(flyoutTitles, async (title, index) => {
              expect(await title.getVisibleText()).to.be(expectedTitles[index]);
            });

            await asyncForEach(flyoutDescriptions, async (description, index) => {
              expect(await description.getVisibleText()).to.be(expectedDescriptions[index]);
            });
          });

          it('Displays a View in App button', async () => {
            await observability.alerts.getAlertsFlyoutViewInAppButtonOrFail();
          });
        });
      });
    });
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { asyncForEach } from '../helpers';

const ACTIVE_ALERTS_CELL_COUNT = 78;
const RECOVERED_ALERTS_CELL_COUNT = 150;
const TOTAL_ALERTS_CELL_COUNT = 200;

const DISABLED_ALERTS_CHECKBOX = 6;
const ENABLED_ALERTS_CHECKBOX = 4;

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const find = getService('find');

  describe('Observability alerts', function () {
    this.tags('includeFirefox');

    const testSubjects = getService('testSubjects');
    const retry = getService('retry');
    const observability = getService('observability');
    const security = getService('security');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      const setup = async () => {
        await observability.alerts.common.setKibanaTimeZoneToUTC();
        await observability.alerts.common.navigateToTimeWithData();
      };
      await setup();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    describe('With no data', () => {
      it('Shows the no data screen', async () => {
        await observability.alerts.common.getNoDataPageOrFail();
      });
    });

    describe('Alerts table', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await observability.alerts.common.navigateToTimeWithData();
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });

      it('Renders the table', async () => {
        await observability.alerts.common.getTableOrFail();
      });

      it('Renders the correct number of cells', async () => {
        await retry.try(async () => {
          const cells = await observability.alerts.common.getTableCells();
          expect(cells.length).to.be(TOTAL_ALERTS_CELL_COUNT);
        });
      });

      describe('Filtering', () => {
        afterEach(async () => {
          await observability.alerts.common.clearQueryBar();
        });

        after(async () => {
          // NOTE: We do this as the query bar takes the place of the datepicker when it is in focus, so we'll reset
          // back to default.
          await observability.alerts.common.submitQuery('');
        });

        it('Autocompletion works', async () => {
          await observability.alerts.common.typeInQueryBar('kibana.alert.s');
          await testSubjects.existOrFail('autocompleteSuggestion-field-kibana.alert.start-');
          await testSubjects.existOrFail('autocompleteSuggestion-field-kibana.alert.status-');
        });

        it('Applies filters correctly', async () => {
          await observability.alerts.common.submitQuery('kibana.alert.status: recovered');
          await retry.try(async () => {
            const cells = await observability.alerts.common.getTableCells();
            expect(cells.length).to.be(RECOVERED_ALERTS_CELL_COUNT);
          });
        });

        it('Displays a no data state when filters produce zero results', async () => {
          await observability.alerts.common.submitQuery('kibana.alert.consumer: uptime');
          await observability.alerts.common.getNoDataStateOrFail();
        });
      });

      describe('Date selection', () => {
        after(async () => {
          await observability.alerts.common.navigateToTimeWithData();
        });

        it('Correctly applies date picker selections', async () => {
          await retry.try(async () => {
            await (await testSubjects.find('superDatePickerToggleQuickMenuButton')).click();
            // We shouldn't expect any data for the last 15 minutes
            await (await testSubjects.find('superDatePickerCommonlyUsed_Last_15 minutes')).click();
            await observability.alerts.common.getNoDataStateOrFail();
          });
        });
      });

      describe('Flyout', () => {
        it('Can be opened', async () => {
          await observability.alerts.common.openAlertsFlyout();
          await observability.alerts.common.getAlertsFlyoutOrFail();
        });

        it('Can be closed', async () => {
          await observability.alerts.common.closeAlertsFlyout();
          await testSubjects.missingOrFail('alertsFlyout');
        });

        describe('When open', async () => {
          before(async () => {
            await observability.alerts.common.openAlertsFlyout();
          });

          after(async () => {
            await observability.alerts.common.closeAlertsFlyout();
          });

          it('Displays the correct title', async () => {
            await retry.try(async () => {
              const titleText = await (
                await observability.alerts.common.getAlertsFlyoutTitle()
              ).getVisibleText();
              expect(titleText).to.contain('APM Failed Transaction Rate (one)');
            });
          });

          it('Displays the correct content', async () => {
            const flyoutTitles =
              await observability.alerts.common.getAlertsFlyoutDescriptionListTitles();
            const flyoutDescriptions =
              await observability.alerts.common.getAlertsFlyoutDescriptionListDescriptions();

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
              'Oct 19, 2021 @ 15:00:41.555',
              '20 minutes',
              '5',
              '30.727896995708154',
              'Failed transaction rate threshold',
            ];

            await asyncForEach(flyoutTitles, async (title, index) => {
              expect(await title.getVisibleText()).to.be(expectedTitles[index]);
            });

            await asyncForEach(flyoutDescriptions, async (description, index) => {
              expect(await description.getVisibleText()).to.be(expectedDescriptions[index]);
            });
          });

          it('Displays a View in App button', async () => {
            await observability.alerts.common.getAlertsFlyoutViewInAppButtonOrFail();
          });

          it('Displays a View rule details link', async () => {
            await observability.alerts.common.getAlertsFlyoutViewRuleDetailsLinkOrFail();
          });
        });
      });

      describe.skip('Cell actions', () => {
        beforeEach(async () => {
          await retry.try(async () => {
            const cells = await observability.alerts.common.getTableCells();
            const alertStatusCell = cells[2];
            await alertStatusCell.moveMouseTo();
            await retry.waitFor(
              'cell actions visible',
              async () => await observability.alerts.common.filterForValueButtonExists()
            );
          });
        });

        afterEach(async () => {
          await observability.alerts.common.clearQueryBar();
          // Reset the query bar by hiding the dropdown
          await observability.alerts.common.submitQuery('');
        });

        it.skip('Filter for value works', async () => {
          await (await observability.alerts.common.getFilterForValueButton()).click();
          const queryBarValue = await (
            await observability.alerts.common.getQueryBar()
          ).getAttribute('value');
          expect(queryBarValue).to.be('kibana.alert.status: "active"');
          // Wait for request
          await retry.try(async () => {
            const cells = await observability.alerts.common.getTableCells();
            expect(cells.length).to.be(ACTIVE_ALERTS_CELL_COUNT);
          });
        });
      });

      describe('Actions Button', () => {
        it('Opens rule details page when click on "View Rule Details"', async () => {
          const actionsButton = await observability.alerts.common.getActionsButtonByIndex(0);
          await actionsButton.click();
          await observability.alerts.common.viewRuleDetailsButtonClick();
          expect(await find.existsByCssSelector('[title="Rules and Connectors"]')).to.eql(true);
        });
      });

      /*
       * ATTENTION FUTURE DEVELOPER
       *
       * These tests should only be valid for 7.17.x
       * You can run this test if you go to this file:
       * x-pack/plugins/observability/public/pages/alerts/containers/alerts_table_t_grid/alerts_table_t_grid.tsx
       * and at line 397 and change showCheckboxes to true
       *
       */
      describe.skip('Bulk Actions', () => {
        before(async () => {
          await security.testUser.setRoles(['global_alerts_logs_all_else_read']);
          await observability.alerts.common.submitQuery('kibana.alert.status: "active"');
        });
        after(async () => {
          await observability.alerts.common.submitQuery('');
          await security.testUser.restoreDefaults();
        });

        it('Only logs alert should be enable for bulk actions', async () => {
          const disabledCheckBoxes =
            await observability.alerts.common.getAllDisabledCheckBoxInTable();
          const enabledCheckBoxes =
            await observability.alerts.common.getAllEnabledCheckBoxInTable();

          expect(disabledCheckBoxes.length).to.eql(DISABLED_ALERTS_CHECKBOX);
          expect(enabledCheckBoxes.length).to.eql(ENABLED_ALERTS_CHECKBOX);
        });

        it('validate formatting of the bulk actions button', async () => {
          const selectAll = await testSubjects.find('select-all-events');
          await selectAll.click();
          const bulkActionsButton = await testSubjects.find('selectedShowBulkActionsButton');
          expect(await bulkActionsButton.getVisibleText()).to.be('Selected 4 alerts');
          await selectAll.click();
        });

        it('validate functionality of the bulk actions button', async () => {
          const selectAll = await testSubjects.find('select-all-events');
          await selectAll.click();

          const bulkActionsButton = await testSubjects.find('selectedShowBulkActionsButton');
          await bulkActionsButton.click();

          const bulkActionsAcknowledgedAlertStatusButton = await testSubjects.find(
            'acknowledged-alert-status'
          );
          await bulkActionsAcknowledgedAlertStatusButton.click();
          await observability.alerts.common.submitQuery(
            'kibana.alert.workflow_status : "acknowledged"'
          );

          await retry.try(async () => {
            const enabledCheckBoxes =
              await observability.alerts.common.getAllEnabledCheckBoxInTable();
            expect(enabledCheckBoxes.length).to.eql(1);
          });
        });
      });
    });
  });
};

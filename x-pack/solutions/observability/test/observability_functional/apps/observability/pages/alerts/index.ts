/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RuleNotifyWhen } from '@kbn/alerting-plugin/common';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { asyncForEach } from '../../helpers';

const TOTAL_ALERTS_CELL_COUNT = 480;
const RECOVERED_ALERTS_CELL_COUNT = 360;
const ACTIVE_ALERTS_CELL_COUNT = 120;

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const find = getService('find');
  const { alertControls } = getPageObjects(['alertControls']);
  const PageObjects = getPageObjects(['home', 'common']);
  const supertest = getService('supertest');
  const browser = getService('browser');

  const customThresholdRule = {
    tags: [],
    params: {
      criteria: [
        {
          comparator: '>',
          metrics: [
            {
              name: 'A',
              aggType: 'count',
            },
          ],
          threshold: [1],
          timeSize: 15,
          timeUnit: 'm',
        },
      ],
      alertOnNoData: false,
      alertOnGroupDisappear: false,
      searchConfiguration: {
        query: {
          query: '',
          language: 'kuery',
        },
        index: '90943e30-9a47-11e8-b64d-95841ca0b247',
      },
    },
    schedule: {
      interval: '1m',
    },
    consumer: 'logs',
    name: 'Custom threshold rule',
    rule_type_id: 'observability.rules.custom_threshold',
    actions: [
      {
        group: 'custom_threshold.fired',
        id: 'my-server-log',
        params: {
          message:
            '{{context.reason}}\n\n{{rule.name}} is active.\n\n[View alert details]({{context.alertDetailsUrl}})\n',
          level: 'info',
        },
        frequency: {
          summary: false,
          notify_when: RuleNotifyWhen.THROTTLE,
          throttle: '1m',
        },
      },
    ],
    alert_delay: {
      active: 1,
    },
  };

  describe('Observability alerts >', function () {
    this.tags('includeFirefox');
    const testSubjects = getService('testSubjects');
    const retry = getService('retry');
    const observability = getService('observability');
    let customThresholdRuleId: string;

    before(async () => {
      await esArchiver.load(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
      );
      const setup = async () => {
        await observability.alerts.common.setKibanaTimeZoneToUTC();
        await observability.alerts.common.navigateToTimeWithData();
        await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
          useActualUrl: true,
        });
        await PageObjects.home.addSampleDataSet('logs');
        const { body: createdRule } = await supertest
          .post('/api/alerting/rule')
          .set('kbn-xsrf', 'foo')
          .send(customThresholdRule)
          .expect(200);

        customThresholdRuleId = createdRule.id;
      };
      await setup();
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/solutions/observability/test/fixtures/es_archives/observability/alerts'
      );
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await supertest.delete(`/api/alerting/rule/${customThresholdRuleId}`).set('kbn-xsrf', 'foo');
      await PageObjects.home.removeSampleDataSet('logs');
    });

    describe('Alerts table', () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/solutions/observability/test/fixtures/es_archives/infra/simple_logs'
        );
        await observability.alerts.common.navigateToTimeWithData();
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/solutions/observability/test/fixtures/es_archives/infra/simple_logs'
        );
      });

      it('Renders the table', async () => {
        await observability.alerts.common.getTableOrFail();
      });

      it('Renders the correct number of cells (active alerts)', async () => {
        await retry.try(async () => {
          const cells = await observability.alerts.common.getTableCells();
          expect(cells.length).to.be(ACTIVE_ALERTS_CELL_COUNT);
        });
      });

      it('Clear status control', async () => {
        await alertControls.clearControlSelections('0');
        await observability.alerts.common.waitForAlertTableToLoad();
      });

      it('Renders the correct number of cells (all alerts)', async () => {
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

        // FLAKY: https://github.com/elastic/kibana/issues/217739
        it.skip('Autocompletion works', async () => {
          await browser.refresh();
          await observability.alerts.common.typeInQueryBar('kibana.alert.s');
          await observability.alerts.common.clickOnQueryBar();
          await testSubjects.existOrFail('autocompleteSuggestion-field-kibana.alert.start-');
          await testSubjects.existOrFail('autocompleteSuggestion-field-kibana.alert.status-');
        });

        it('Invalid input should not break the page', async () => {
          await observability.alerts.common.submitQuery('""""');
          await testSubjects.existOrFail('errorToastMessage');
          // Page should not go blank with invalid input
          await testSubjects.existOrFail('alertsPageWithData');
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
          // Clear active status
          await alertControls.clearControlSelections('0');
          await observability.alerts.common.waitForAlertTableToLoad();
        });

        it('Correctly applies date picker selections', async () => {
          await retry.try(async () => {
            await observability.alerts.common.submitQuery('kibana.alert.status: recovered');
            await (await testSubjects.find('superDatePickerToggleQuickMenuButton')).click();
            // We shouldn't expect any recovered alert for the last 15 minutes
            await (await testSubjects.find('superDatePickerCommonlyUsed_Last_15 minutes')).click();
            await observability.alerts.common.getNoDataStateOrFail();
          });
        });
      });

      describe('Actions Button', () => {
        after(async () => {
          await observability.alerts.common.navigateToTimeWithData();
          // Clear active status
          await alertControls.clearControlSelections('0');
          await observability.alerts.common.waitForAlertTableToLoad();
        });

        it('Opens rule details page when click on "View Rule Details"', async () => {
          const actionsButton = await observability.alerts.common.getActionsButtonByIndex(0);
          await actionsButton.click();
          await observability.alerts.common.viewRuleDetailsButtonClick();

          expect(
            await (await find.byCssSelector('[data-test-subj="breadcrumb first"]')).getVisibleText()
          ).to.eql('Observability');
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

        describe('When open', () => {
          before(async () => {
            await observability.alerts.common.openAlertsFlyout(20);
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
              'Started at',
              'Last updated',
              'Duration',
              'Expected value',
              'Actual value',
              'Rule type',
            ];
            const expectedDescriptions = [
              'Active',
              'Oct 19, 2021 @ 15:00:41.555',
              'Oct 19, 2021 @ 15:20:38.749',
              '20 minutes',
              '5.0%',
              '31%',
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
    });
  });
};

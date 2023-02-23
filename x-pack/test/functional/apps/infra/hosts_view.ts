/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES, HOSTS_LINK_LOCAL_STORAGE_KEY } from './constants';

const START_DATE = moment.utc(DATES.metricsAndLogs.hosts.min);
const END_DATE = moment.utc(DATES.metricsAndLogs.hosts.max);
const timepickerFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const security = getService('security');
  const pageObjects = getPageObjects([
    'common',
    'infraHome',
    'timePicker',
    'infraHostsView',
    'security',
    'settings',
  ]);

  // Helpers

  const loginWithReadOnlyUserAndNavigateToInfra = async () => {
    await security.role.create('global_hosts_read_privileges_role', {
      elasticsearch: {
        indices: [{ names: ['metricbeat-*'], privileges: ['read', 'view_index_metadata'] }],
      },
      kibana: [
        {
          feature: {
            infrastructure: ['read'],
            advancedSettings: ['read'],
          },
          spaces: ['*'],
        },
      ],
    });

    await security.user.create('global_hosts_read_privileges_user', {
      password: 'global_hosts_read_privileges_user-password',
      roles: ['global_hosts_read_privileges_role'],
      full_name: 'test user',
    });

    await pageObjects.security.forceLogout();

    await pageObjects.security.login(
      'global_hosts_read_privileges_user',
      'global_hosts_read_privileges_user-password',
      {
        expectSpaceSelector: false,
      }
    );

    await browser.removeLocalStorageItem(HOSTS_LINK_LOCAL_STORAGE_KEY);
    await pageObjects.common.navigateToApp('infraOps');
  };

  const logoutAndDeleteReadOnlyUser = async () => {
    await pageObjects.security.forceLogout();
    await Promise.all([
      security.role.delete('global_hosts_read_privileges_role'),
      security.user.delete('global_hosts_read_privileges_user'),
    ]);
  };

  const navigateAndDisableHostView = async () => {
    await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    await browser.removeLocalStorageItem(HOSTS_LINK_LOCAL_STORAGE_KEY);
    await pageObjects.common.navigateToApp('infraOps');
    await pageObjects.common.navigateToUrl('management', 'kibana/settings', {
      basePath: `/s/default`,
      ensureCurrentUrl: false,
      shouldLoginIfPrompted: false,
      shouldUseHashForSubUrl: false,
    });
    await pageObjects.settings.toggleAdvancedSettingCheckbox(
      'observability:enableInfrastructureHostsView',
      false
    );
    return esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
  };

  const navigateAndEnableHostView = async () => {
    await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    await browser.removeLocalStorageItem(HOSTS_LINK_LOCAL_STORAGE_KEY);
    await pageObjects.common.navigateToApp('infraOps');
    await pageObjects.infraHome.clickDismissKubernetesTourButton();
    await pageObjects.infraHostsView.clickTryHostViewLink();
    await pageObjects.infraHostsView.clickEnableHostViewButton();
  };

  // Tests

  describe('Hosts view', function () {
    this.tags('includeFirefox');
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('shows hosts view landing page for admin', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.clickDismissKubernetesTourButton();
        await pageObjects.infraHostsView.clickTryHostViewBadge();
      });
      after(async () => {
        await browser.removeLocalStorageItem(HOSTS_LINK_LOCAL_STORAGE_KEY);
        return esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });

      it('should show hosts landing page with enable button when the hosts view is disabled', async () => {
        const landingPageEnableButton =
          await pageObjects.infraHostsView.getHostsLandingPageEnableButton();
        const landingPageEnableButtonText = await landingPageEnableButton.getVisibleText();
        expect(landingPageEnableButtonText).to.eql('Enable hosts view');
      });
    });

    describe('should show hosts view landing page for user with read permission', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await loginWithReadOnlyUserAndNavigateToInfra();
        await pageObjects.infraHome.clickDismissKubernetesTourButton();
        await pageObjects.infraHostsView.clickTryHostViewBadge();
      });
      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await logoutAndDeleteReadOnlyUser();
        return esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });

      it('should show hosts landing page with callout when the hosts view is disabled', async () => {
        const landingPageDisabled = await pageObjects.infraHostsView.getHostsLandingPageDisabled();
        const learnMoreDocsUrl = await pageObjects.infraHostsView.getHostsLandingPageDocsLink();
        const parsedUrl = new URL(learnMoreDocsUrl);

        expect(parsedUrl.host).to.be('www.elastic.co');
        expect(parsedUrl.pathname).to.be('/guide/en/kibana/current/kibana-privileges.html');
        expect(landingPageDisabled).to.contain(
          'Your user role doesn’t have sufficient privileges to enable this feature'
        );
      });
    });

    describe('enables hosts view page and checks content', () => {
      before(async () => {
        await navigateAndEnableHostView();
        await pageObjects.timePicker.setAbsoluteRange(
          START_DATE.format(timepickerFormat),
          END_DATE.format(timepickerFormat)
        );
      });
      after(async () => {
        await navigateAndDisableHostView();
      });

      describe('should show hosts page for admin user and see the page content', async () => {
        it('should render the correct page title', async () => {
          const documentTitle = await browser.getTitle();
          expect(documentTitle).to.contain('Hosts - Infrastructure - Observability - Elastic');
        });

        it('should have six hosts', async () => {
          const hosts = await pageObjects.infraHostsView.getHostsTableData();
          expect(hosts.length).to.equal(6);
        });

        it('should load 5 metrics trend tiles', async () => {
          const hosts = await pageObjects.infraHostsView.getAllMetricsTrendTiles();
          expect(hosts.length).to.equal(5);
        });

        [
          { metric: 'hosts', value: '6' },
          { metric: 'cpu', value: '0.8%' },
          { metric: 'memory', value: '16.8%' },
          { metric: 'tx', value: '0 bit/s' },
          { metric: 'rx', value: '0 bit/s' },
        ].forEach(({ metric, value }) => {
          it(`${metric} tile should show ${value}`, async () => {
            const tileValue = await pageObjects.infraHostsView.getMetricsTrendTileValue(metric);
            expect(tileValue).to.eql(value);
          });
        });
      });
    });

    describe('should show hosts page for read only user and see the page content', async () => {
      before(async () => {
        await navigateAndEnableHostView();
        await loginWithReadOnlyUserAndNavigateToInfra();
        await browser.removeLocalStorageItem(HOSTS_LINK_LOCAL_STORAGE_KEY);
        await pageObjects.infraHostsView.clickTryHostViewLink();
        await pageObjects.timePicker.setAbsoluteRange(
          START_DATE.format(timepickerFormat),
          END_DATE.format(timepickerFormat)
        );
      });
      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await logoutAndDeleteReadOnlyUser();
        await navigateAndDisableHostView();
      });

      it('should have six hosts', async () => {
        const hosts = await pageObjects.infraHostsView.getHostsTableData();
        expect(hosts.length).to.equal(6);
      });

      it('should load 5 metrics trend tiles', async () => {
        const hosts = await pageObjects.infraHostsView.getAllMetricsTrendTiles();
        expect(hosts.length).to.equal(5);
      });

      [
        { metric: 'hosts', value: '6' },
        { metric: 'cpu', value: '0.8%' },
        { metric: 'memory', value: '16.8%' },
        { metric: 'tx', value: '0 bit/s' },
        { metric: 'rx', value: '0 bit/s' },
      ].forEach(({ metric, value }) => {
        it(`${metric} tile should show ${value}`, async () => {
          const tileValue = await pageObjects.infraHostsView.getMetricsTrendTileValue(metric);
          expect(tileValue).to.eql(value);
        });
      });

      describe('Lens charts', () => {
        it('should load 8 lens metric charts', async () => {
          const metricCharts = await pageObjects.infraHostsView.getAllMetricsCharts();
          expect(metricCharts.length).to.equal(8);
        });

        it('should have an option to open the chart in lens', async () => {
          await pageObjects.infraHostsView.getOpenInLensOption();
        });
      });
    });

    describe('Alerts Tab', () => {
      const testSubjects = getService('testSubjects');
      const retry = getService('retry');
      const observability = getService('observability');

      before(async () => {
        await navigateAndEnableHostView();
        await loginWithReadOnlyUserAndNavigateToInfra();
        await browser.removeLocalStorageItem(HOSTS_LINK_LOCAL_STORAGE_KEY);
        await pageObjects.infraHostsView.clickTryHostViewLink();
        await pageObjects.timePicker.setAbsoluteRange(
          START_DATE.format(timepickerFormat),
          END_DATE.format(timepickerFormat)
        );
        await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      });

      it('should correctly load the Alerts tab section when clicking on it', async () => {
        const alertsTab = await pageObjects.infraHostsView.getAlertsTab();
        await alertsTab.click();

        // Assert section is rendered
        testSubjects.existOrFail('hostsView-alerts');
      });

      // describe('Alerts table', () => {
      //   before(async () => {
      //     await esArchiver.load('x-pack/test/functional/es_archives/infra/simple_logs');
      //     await observability.alerts.common.navigateToTimeWithData();
      //   });

      //   after(async () => {
      //     await esArchiver.unload('x-pack/test/functional/es_archives/infra/simple_logs');
      //   });

      //   it('Renders the table', async () => {
      //     await observability.alerts.common.getTableOrFail();
      //   });

      //   it('Renders the correct number of cells', async () => {
      //     await retry.try(async () => {
      //       const cells = await observability.alerts.common.getTableCells();
      //       expect(cells.length).to.be(TOTAL_ALERTS_CELL_COUNT);
      //     });
      //   });

      //   describe('Filtering', () => {
      //     afterEach(async () => {
      //       await observability.alerts.common.clearQueryBar();
      //     });

      //     after(async () => {
      //       // NOTE: We do this as the query bar takes the place of the datepicker when it is in focus, so we'll reset
      //       // back to default.
      //       await observability.alerts.common.submitQuery('');
      //     });

      //     it('Autocompletion works', async () => {
      //       await observability.alerts.common.typeInQueryBar('kibana.alert.s');
      //       await testSubjects.existOrFail('autocompleteSuggestion-field-kibana.alert.start-');
      //       await testSubjects.existOrFail('autocompleteSuggestion-field-kibana.alert.status-');
      //     });

      //     it('Invalid input should not break the page', async () => {
      //       await observability.alerts.common.submitQuery('""""');
      //       await testSubjects.existOrFail('errorToastMessage');
      //       // Page should not go blank with invalid input
      //       await testSubjects.existOrFail('alertsPageWithData');
      //     });

      //     it('Applies filters correctly', async () => {
      //       await observability.alerts.common.submitQuery('kibana.alert.status: recovered');
      //       await retry.try(async () => {
      //         const cells = await observability.alerts.common.getTableCells();
      //         expect(cells.length).to.be(RECOVERED_ALERTS_CELL_COUNT);
      //       });
      //     });

      //     it('Displays a no data state when filters produce zero results', async () => {
      //       await observability.alerts.common.submitQuery('kibana.alert.consumer: uptime');
      //       await observability.alerts.common.getNoDataStateOrFail();
      //     });
      //   });

      //   describe('Date selection', () => {
      //     after(async () => {
      //       await observability.alerts.common.navigateToTimeWithData();
      //     });

      //     it('Correctly applies date picker selections', async () => {
      //       await retry.try(async () => {
      //         await (await testSubjects.find('superDatePickerToggleQuickMenuButton')).click();
      //         // We shouldn't expect any data for the last 15 minutes
      //         await (
      //           await testSubjects.find('superDatePickerCommonlyUsed_Last_15 minutes')
      //         ).click();
      //         await observability.alerts.common.getNoDataStateOrFail();
      //       });
      //     });
      //   });

      //   describe('Flyout', () => {
      //     it('Can be opened', async () => {
      //       await observability.alerts.common.openAlertsFlyout();
      //       await observability.alerts.common.getAlertsFlyoutOrFail();
      //     });

      //     it('Can be closed', async () => {
      //       await observability.alerts.common.closeAlertsFlyout();
      //       await testSubjects.missingOrFail('alertsFlyout');
      //     });

      //     describe('When open', async () => {
      //       before(async () => {
      //         await observability.alerts.common.openAlertsFlyout();
      //       });

      //       after(async () => {
      //         await observability.alerts.common.closeAlertsFlyout();
      //       });

      //       it('Displays the correct title', async () => {
      //         await retry.try(async () => {
      //           const titleText = await (
      //             await observability.alerts.common.getAlertsFlyoutTitle()
      //           ).getVisibleText();
      //           expect(titleText).to.contain('APM Failed Transaction Rate (one)');
      //         });
      //       });

      //       it('Displays the correct content', async () => {
      //         const flyoutTitles =
      //           await observability.alerts.common.getAlertsFlyoutDescriptionListTitles();
      //         const flyoutDescriptions =
      //           await observability.alerts.common.getAlertsFlyoutDescriptionListDescriptions();

      //         const expectedTitles = [
      //           'Status',
      //           'Started at',
      //           'Last updated',
      //           'Duration',
      //           'Expected value',
      //           'Actual value',
      //           'Rule type',
      //         ];
      //         const expectedDescriptions = [
      //           'Active',
      //           'Oct 19, 2021 @ 15:00:41.555',
      //           'Oct 19, 2021 @ 15:20:38.749',
      //           '20 minutes',
      //           '5.0%',
      //           '31%',
      //           'Failed transaction rate threshold',
      //         ];

      //         await asyncForEach(flyoutTitles, async (title, index) => {
      //           expect(await title.getVisibleText()).to.be(expectedTitles[index]);
      //         });

      //         await asyncForEach(flyoutDescriptions, async (description, index) => {
      //           expect(await description.getVisibleText()).to.be(expectedDescriptions[index]);
      //         });
      //       });

      //       it('Displays a View in App button', async () => {
      //         await observability.alerts.common.getAlertsFlyoutViewInAppButtonOrFail();
      //       });

      //       it('Displays a View rule details link', async () => {
      //         await observability.alerts.common.getAlertsFlyoutViewRuleDetailsLinkOrFail();
      //       });
      //     });
      //   });

      //   describe.skip('Cell actions', () => {
      //     beforeEach(async () => {
      //       await retry.try(async () => {
      //         const cells = await observability.alerts.common.getTableCells();
      //         const alertStatusCell = cells[2];
      //         await alertStatusCell.moveMouseTo();
      //         await retry.waitFor(
      //           'cell actions visible',
      //           async () => await observability.alerts.common.filterForValueButtonExists()
      //         );
      //       });
      //     });

      //     afterEach(async () => {
      //       await observability.alerts.common.clearQueryBar();
      //       // Reset the query bar by hiding the dropdown
      //       await observability.alerts.common.submitQuery('');
      //     });

      //     it.skip('Filter for value works', async () => {
      //       await (await observability.alerts.common.getFilterForValueButton()).click();
      //       const queryBarValue = await (
      //         await observability.alerts.common.getQueryBar()
      //       ).getAttribute('value');
      //       expect(queryBarValue).to.be('kibana.alert.status: "active"');
      //       // Wait for request
      //       await retry.try(async () => {
      //         const cells = await observability.alerts.common.getTableCells();
      //         expect(cells.length).to.be(ACTIVE_ALERTS_CELL_COUNT);
      //       });
      //     });
      //   });

      //   describe('Actions Button', () => {
      //     it('Opens rule details page when click on "View Rule Details"', async () => {
      //       const actionsButton = await observability.alerts.common.getActionsButtonByIndex(0);
      //       await actionsButton.click();
      //       await observability.alerts.common.viewRuleDetailsButtonClick();
      //       expect(
      //         await (
      //           await find.byCssSelector('[data-test-subj="breadcrumb first"]')
      //         ).getVisibleText()
      //       ).to.eql('Observability');
      //     });
      //   });

      //   describe.skip('Bulk Actions', () => {
      //     before(async () => {
      //       await security.testUser.setRoles(['global_alerts_logs_all_else_read']);
      //       await observability.alerts.common.submitQuery('kibana.alert.status: "active"');
      //     });
      //     after(async () => {
      //       await observability.alerts.common.submitQuery('');
      //       await security.testUser.restoreDefaults();
      //     });

      //     it('Only logs alert should be enable for bulk actions', async () => {
      //       const disabledCheckBoxes =
      //         await observability.alerts.common.getAllDisabledCheckBoxInTable();
      //       const enabledCheckBoxes =
      //         await observability.alerts.common.getAllEnabledCheckBoxInTable();

      //       expect(disabledCheckBoxes.length).to.eql(DISABLED_ALERTS_CHECKBOX);
      //       expect(enabledCheckBoxes.length).to.eql(ENABLED_ALERTS_CHECKBOX);
      //     });

      //     it('validate formatting of the bulk actions button', async () => {
      //       const selectAll = await testSubjects.find('select-all-events');
      //       await selectAll.click();
      //       const bulkActionsButton = await testSubjects.find('selectedShowBulkActionsButton');
      //       expect(await bulkActionsButton.getVisibleText()).to.be('Selected 4 alerts');
      //       await selectAll.click();
      //     });

      //     it('validate functionality of the bulk actions button', async () => {
      //       const selectAll = await testSubjects.find('select-all-events');
      //       await selectAll.click();

      //       const bulkActionsButton = await testSubjects.find('selectedShowBulkActionsButton');
      //       await bulkActionsButton.click();

      //       const bulkActionsAcknowledgedAlertStatusButton = await testSubjects.find(
      //         'acknowledged-alert-status'
      //       );
      //       await bulkActionsAcknowledgedAlertStatusButton.click();
      //       await observability.alerts.common.submitQuery(
      //         'kibana.alert.workflow_status : "acknowledged"'
      //       );

      //       await retry.try(async () => {
      //         const enabledCheckBoxes =
      //           await observability.alerts.common.getAllEnabledCheckBoxInTable();
      //         expect(enabledCheckBoxes.length).to.eql(1);
      //       });
      //     });
      //   });
      // });
    });
  });
};

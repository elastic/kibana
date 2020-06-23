/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

const CREATE_DRILLDOWN_FLYOUT_DATA_TEST_SUBJ = 'createDrilldownFlyout';
const MANAGE_DRILLDOWNS_FLYOUT_DATA_TEST_SUBJ = 'editDrilldownFlyout';
const DASHBOARD_TO_DASHBOARD_ACTION_LIST_ITEM =
  'actionFactoryItem-DASHBOARD_TO_DASHBOARD_DRILLDOWN';
const DASHBOARD_TO_DASHBOARD_ACTION_WIZARD =
  'selectedActionFactory-DASHBOARD_TO_DASHBOARD_DRILLDOWN';
const DESTINATION_DASHBOARD_SELECT = 'dashboardDrilldownSelectDashboard';
const DRILLDOWN_WIZARD_SUBMIT = 'drilldownWizardSubmit';

export function DashboardDrilldownsManageProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const flyout = getService('flyout');
  const comboBox = getService('comboBox');
  const esArchiver = getService('esArchiver');

  return new (class DashboardDrilldownsManage {
    readonly DASHBOARD_WITH_PIE_CHART_NAME = 'Dashboard with Pie Chart';
    readonly DASHBOARD_WITH_AREA_CHART_NAME = 'Dashboard With Area Chart';

    async loadData() {
      log.debug('loadData');
      await esArchiver.load('dashboard/drilldowns');
    }

    async unloadData() {
      log.debug('unloadData');
      await esArchiver.unload('dashboard/drilldowns');
    }

    async expectsCreateDrilldownFlyoutOpen() {
      log.debug('expectsCreateDrilldownFlyoutOpen');
      await testSubjects.existOrFail(CREATE_DRILLDOWN_FLYOUT_DATA_TEST_SUBJ);
    }

    async expectsManageDrilldownsFlyoutOpen() {
      log.debug('expectsManageDrilldownsFlyoutOpen');
      await testSubjects.existOrFail(MANAGE_DRILLDOWNS_FLYOUT_DATA_TEST_SUBJ);
    }

    async expectsCreateDrilldownFlyoutClose() {
      log.debug('expectsCreateDrilldownFlyoutClose');
      await testSubjects.missingOrFail(CREATE_DRILLDOWN_FLYOUT_DATA_TEST_SUBJ);
    }

    async expectsManageDrilldownsFlyoutClose() {
      log.debug('expectsManageDrilldownsFlyoutClose');
      await testSubjects.missingOrFail(MANAGE_DRILLDOWNS_FLYOUT_DATA_TEST_SUBJ);
    }

    async fillInDashboardToDashboardDrilldownWizard({
      drilldownName,
      destinationDashboardTitle,
    }: {
      drilldownName: string;
      destinationDashboardTitle: string;
    }) {
      await this.fillInDrilldownName(drilldownName);
      await this.selectDashboardToDashboardActionIfNeeded();
      await this.selectDestinationDashboard(destinationDashboardTitle);
    }

    async fillInDrilldownName(name: string) {
      await testSubjects.setValue('drilldownNameInput', name);
    }

    async selectDashboardToDashboardActionIfNeeded() {
      if (await testSubjects.exists(DASHBOARD_TO_DASHBOARD_ACTION_LIST_ITEM)) {
        await testSubjects.click(DASHBOARD_TO_DASHBOARD_ACTION_LIST_ITEM);
      }
      await testSubjects.existOrFail(DASHBOARD_TO_DASHBOARD_ACTION_WIZARD);
    }

    async selectDestinationDashboard(title: string) {
      await comboBox.set(DESTINATION_DASHBOARD_SELECT, title);
    }

    async saveChanges() {
      await testSubjects.click(DRILLDOWN_WIZARD_SUBMIT);
    }

    async deleteDrilldownsByTitles(titles: string[]) {
      const drilldowns = await testSubjects.findAll('listManageDrilldownsItem');

      for (const drilldown of drilldowns) {
        const nameColumn = await drilldown.findByTestSubject('drilldownListItemName');
        const name = await nameColumn.getVisibleText();
        if (titles.includes(name)) {
          const checkbox = await drilldown.findByTagName('input');
          await checkbox.click();
        }
      }
      const deleteBtn = await testSubjects.find('listManageDeleteDrilldowns');
      await deleteBtn.click();
    }

    async closeFlyout() {
      await flyout.ensureAllClosed();
    }
  })();
}

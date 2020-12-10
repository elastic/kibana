/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommonUI } from './common_ui';

export function MachineLearningSettingsCalendarProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI
) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const comboBox = getService('comboBox');

  return {
    async parseCalendarTable() {
      const table = await testSubjects.find('~mlCalendarTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~mlCalendarListRow').toArray()) {
        const $tr = $(tr);

        rows.push({
          id: $tr
            .findTestSubject('mlCalendarListColumnId')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          jobs: $tr
            .findTestSubject('mlCalendarListColumnJobs')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          events: $tr
            .findTestSubject('mlCalendarListColumnEvents')
            .find('.euiTableCellContent')
            .text()
            .trim(),
        });
      }

      return rows;
    },

    calendarRowSelector(calendarId: string, subSelector?: string) {
      const row = `~mlCalendarTable > ~row-${calendarId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    },

    async waitForCalendarTableToLoad() {
      await testSubjects.existOrFail('~mlCalendarTable', { timeout: 60 * 1000 });
      await testSubjects.existOrFail('mlCalendarTable loaded', { timeout: 30 * 1000 });
    },

    async filterWithSearchString(filter: string, expectedRowCount: number = 1) {
      await this.waitForCalendarTableToLoad();
      const tableListContainer = await testSubjects.find('mlCalendarTableContainer');
      const searchBarInput = await tableListContainer.findByClassName('euiFieldSearch');
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(filter);

      const rows = await this.parseCalendarTable();
      const filteredRows = rows.filter((row) => row.id === filter);
      expect(filteredRows).to.have.length(
        expectedRowCount,
        `Filtered calendar table should have ${expectedRowCount} row(s) for filter '${filter}' (got matching items '${filteredRows}')`
      );
    },

    async isCalendarRowSelected(calendarId: string): Promise<boolean> {
      return await testSubjects.isChecked(
        this.calendarRowSelector(calendarId, `checkboxSelectRow-${calendarId}`)
      );
    },

    async assertCalendarRowSelected(calendarId: string, expectedValue: boolean) {
      const isSelected = await this.isCalendarRowSelected(calendarId);
      expect(isSelected).to.eql(
        expectedValue,
        `Expected calendar row for calendar '${calendarId}' to be '${
          expectedValue ? 'selected' : 'deselected'
        }' (got '${isSelected ? 'selected' : 'deselected'}')`
      );
    },

    async selectCalendarRow(calendarId: string) {
      if ((await this.isCalendarRowSelected(calendarId)) === false) {
        await testSubjects.click(
          this.calendarRowSelector(calendarId, `checkboxSelectRow-${calendarId}`)
        );
      }

      await this.assertCalendarRowSelected(calendarId, true);
    },

    async deselectCalendarRow(calendarId: string) {
      if ((await this.isCalendarRowSelected(calendarId)) === true) {
        await testSubjects.click(
          this.calendarRowSelector(calendarId, `checkboxSelectRow-${calendarId}`)
        );
      }

      await this.assertCalendarRowSelected(calendarId, false);
    },

    async assertCreateCalendarButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlCalendarButtonCreate');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "create calendar" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async assertDeleteCalendarButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlCalendarButtonDelete');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "delete calendar" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async openCalendarEditForm(calendarId: string) {
      await testSubjects.click(this.calendarRowSelector(calendarId, 'mlEditCalendarLink'));
      await testSubjects.existOrFail('mlPageCalendarEdit > mlCalendarFormEdit', { timeout: 5000 });
    },

    async assertApplyToAllJobsSwitchEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlCalendarApplyToAllJobsSwitch');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "apply calendar to all jobs" switch to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async assertJobSelectionEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled(
        'mlCalendarJobSelection > comboBoxToggleListButton'
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "job" selection to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertJobGroupSelectionEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled(
        'mlCalendarJobGroupSelection > comboBoxToggleListButton'
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "job group" selection to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertNewEventButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlCalendarNewEventButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "new event" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertImportEventsButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlCalendarImportEventsButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "imports events" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    eventRowSelector(eventDescription: string, subSelector?: string) {
      const row = `~mlCalendarEventsTable > ~row-${eventDescription}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    },

    async assertEventRowExists(eventDescription: string) {
      await testSubjects.existOrFail(this.eventRowSelector(eventDescription));
    },

    async assertEventRowMissing(eventDescription: string) {
      await testSubjects.missingOrFail(this.eventRowSelector(eventDescription));
    },

    async assertDeleteEventButtonEnabled(eventDescription: string, expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled(
        this.eventRowSelector(eventDescription, 'mlCalendarEventDeleteButton')
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "delete event" button for event '${eventDescription}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async assertCalendarRowExists(calendarId: string) {
      await testSubjects.existOrFail(this.calendarRowSelector(calendarId));
    },

    async assertCalendarRowNotExists(calendarId: string) {
      await testSubjects.missingOrFail(this.calendarRowSelector(calendarId));
    },

    async assertCalendarIdValue(expectedValue: string) {
      const actualValue = await testSubjects.getAttribute('mlCalendarIdInput', 'value');
      expect(actualValue).to.eql(
        expectedValue,
        `Calendar id should be '${expectedValue}' (got '${actualValue}')`
      );
    },

    async assertCalendarTitleValue(expectedCalendarId: string) {
      const actualValue = await testSubjects.getVisibleText('mlCalendarTitle');
      const expectedValue = `Calendar ${expectedCalendarId}`;
      expect(actualValue).to.eql(
        expectedValue,
        `Calendar title should be '${expectedValue}' (got '${actualValue}')`
      );
    },

    async setCalendarId(calendarId: string) {
      await mlCommonUI.setValueWithChecks('mlCalendarIdInput', calendarId, {
        clearWithKeyboard: true,
      });
      await this.assertCalendarIdValue(calendarId);
    },

    async assertCalendarDescriptionValue(expectedValue: string) {
      const actualValue = await testSubjects.getAttribute('mlCalendarDescriptionInput', 'value');
      expect(actualValue).to.eql(
        expectedValue,
        `Calendar description should be '${expectedValue}' (got '${actualValue}')`
      );
    },

    async setCalendarDescription(description: string) {
      await mlCommonUI.setValueWithChecks('mlCalendarDescriptionInput', description, {
        clearWithKeyboard: true,
      });
      await this.assertCalendarDescriptionValue(description);
    },

    async getApplyToAllJobsSwitchCheckedState(): Promise<boolean> {
      const subj = 'mlCalendarApplyToAllJobsSwitch';
      const isSelected = await testSubjects.getAttribute(subj, 'aria-checked');
      return isSelected === 'true';
    },

    async assertApplyToAllJobsSwitchCheckState(expectedCheckState: boolean) {
      const actualCheckState = await this.getApplyToAllJobsSwitchCheckedState();
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Apply to all jobs switch check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async toggleApplyToAllJobsSwitch(toggle: boolean) {
      const subj = 'mlCalendarApplyToAllJobsSwitch';
      if ((await this.getApplyToAllJobsSwitchCheckedState()) !== toggle) {
        await retry.tryForTime(5 * 1000, async () => {
          await testSubjects.clickWhenNotDisabled(subj);
          await this.assertApplyToAllJobsSwitchCheckState(toggle);
        });
      }
    },

    async saveCalendar() {
      await testSubjects.existOrFail('mlSaveCalendarButton');
      await testSubjects.click('mlSaveCalendarButton');
      await testSubjects.existOrFail('mlPageCalendarManagement');
    },

    async navigateToCalendarCreationPage() {
      await testSubjects.existOrFail('mlCalendarButtonCreate');
      await testSubjects.click('mlCalendarButtonCreate');
      await testSubjects.existOrFail('mlPageCalendarEdit > mlCalendarFormNew', { timeout: 5000 });
    },

    async openNewCalendarEventForm() {
      await testSubjects.existOrFail('mlCalendarNewEventButton');
      await testSubjects.click('mlCalendarNewEventButton');
      await testSubjects.existOrFail('mlCalendarEventForm');
    },

    async assertCalendarEventDescriptionValue(expectedValue: string) {
      const actualValue = await testSubjects.getAttribute(
        'mlCalendarEventDescriptionInput',
        'value'
      );
      expect(actualValue).to.eql(
        expectedValue,
        `Calendar event description should be '${expectedValue}' (got '${actualValue}')`
      );
    },

    async setCalendarEventDescription(eventDescription: string) {
      await testSubjects.existOrFail('mlCalendarEventDescriptionInput');
      await mlCommonUI.setValueWithChecks('mlCalendarEventDescriptionInput', eventDescription, {
        clearWithKeyboard: true,
      });
      await this.assertCalendarEventDescriptionValue(eventDescription);
    },

    async cancelNewCalendarEvent() {
      await testSubjects.existOrFail('mlCalendarCancelEventButton');
      await testSubjects.click('mlCalendarCancelEventButton');
      await testSubjects.missingOrFail('mlCalendarEventForm');
    },

    async addNewCalendarEvent() {
      await testSubjects.existOrFail('mlCalendarAddEventButton');
      await testSubjects.click('mlCalendarAddEventButton');
      await testSubjects.missingOrFail('mlCalendarEventForm');
    },

    async assertJobSelectionExists() {
      await testSubjects.existOrFail('mlCalendarJobSelection');
    },

    async assertJobSelectionNotExists() {
      await testSubjects.missingOrFail('mlCalendarJobSelection');
    },

    async assertJobSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlCalendarJobSelection > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected job selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async assertJobSelectionContain(expectedIdentifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlCalendarJobSelection > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.contain(
        expectedIdentifier,
        `Expected job selection to contain '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async selectJob(identifier: string) {
      await comboBox.set('mlCalendarJobSelection > comboBoxInput', identifier);
      await this.assertJobSelectionContain(identifier);
    },

    async assertJobGroupSelectionExists() {
      await testSubjects.existOrFail('mlCalendarJobGroupSelection');
    },

    async assertJobGroupSelectionNotExists() {
      await testSubjects.missingOrFail('mlCalendarJobGroupSelection');
    },

    async assertJobGroupSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlCalendarJobGroupSelection > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected job group selection to be'${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async assertJobGroupSelectionContain(expectedIdentifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlCalendarJobGroupSelection > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.contain(
        expectedIdentifier,
        `Expected job group selection to contain'${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async selectJobGroup(identifier: string) {
      await comboBox.set('mlCalendarJobGroupSelection > comboBoxInput', identifier);
      await this.assertJobGroupSelectionContain(identifier);
    },

    async deleteCalendarEventRow(eventDescription: string) {
      await this.assertEventRowExists(eventDescription);
      await testSubjects.click(
        this.eventRowSelector(eventDescription, 'mlCalendarEventDeleteButton')
      );
      await this.assertEventRowMissing(eventDescription);
    },

    async deleteCalendar() {
      await this.assertDeleteCalendarButtonEnabled(true);
      await testSubjects.click('mlCalendarButtonDelete');
      await testSubjects.existOrFail('mlCalendarDeleteConfirmation');
      await testSubjects.existOrFail('confirmModalConfirmButton');
      await testSubjects.click('confirmModalConfirmButton');
      await testSubjects.missingOrFail('mlCalendarDeleteConfirmation');
    },
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningSettingsCalendarProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

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

    rowSelector(calendarId: string, subSelector?: string) {
      const row = `~mlCalendarTable > ~row-${calendarId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    },

    async filterWithSearchString(filter: string, expectedRowCount: number = 1) {
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
        this.rowSelector(calendarId, `checkboxSelectRow-${calendarId}`)
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
        await testSubjects.click(this.rowSelector(calendarId, `checkboxSelectRow-${calendarId}`));
      }

      await this.assertCalendarRowSelected(calendarId, true);
    },

    async deselectCalendarRow(calendarId: string) {
      if ((await this.isCalendarRowSelected(calendarId)) === true) {
        await testSubjects.click(this.rowSelector(calendarId, `checkboxSelectRow-${calendarId}`));
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
      await testSubjects.click(this.rowSelector(calendarId, 'mlEditCalendarLink'));
      await testSubjects.existOrFail('mlPageCalendarEdit');
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
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningSettingsProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertManageCalendarsLinkExists() {
      await testSubjects.existOrFail('mlCalendarsMngButton');
    },

    async assertManageCalendarsLinkEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlCalendarsMngButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "manage calendars" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async assertCreateCalendarLinkExists() {
      await testSubjects.existOrFail('mlCalendarsCreateButton');
    },

    async assertCreateCalendarLinkEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlCalendarsCreateButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "create calendars" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async assertManageFilterListsLinkExists() {
      await testSubjects.existOrFail('mlFilterListsMngButton');
    },

    async assertManageFilterListsLinkEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlFilterListsMngButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "manage filter lists" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async assertCreateFilterListLinkExists() {
      await testSubjects.existOrFail('mlFilterListsCreateButton');
    },

    async assertCreateFilterListLinkEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlFilterListsCreateButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "create filter lists" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async navigateToCalendarManagement() {
      await testSubjects.click('mlCalendarsMngButton');
      await testSubjects.existOrFail('mlPageCalendarManagement');
    },

    async navigateToFilterListsManagement() {
      await testSubjects.click('mlFilterListsMngButton');
      await testSubjects.existOrFail('mlPageFilterListManagement');
    },
  };
}

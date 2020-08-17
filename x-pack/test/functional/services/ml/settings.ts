/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningSettingsProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertSettingsManageCalendarsLinkExists() {
      await testSubjects.existOrFail('mlCalendarsMngButton');
    },

    async assertSettingsCreateCalendarLinkExists() {
      await testSubjects.existOrFail('mlCalendarsCreateButton');
    },

    async assertSettingsManageFilterListsLinkExists() {
      await testSubjects.existOrFail('mlFilterListsMngButton');
    },

    async assertSettingsCreateFilterListLinkExists() {
      await testSubjects.existOrFail('mlFilterListsCreateButton');
    },
  };
}

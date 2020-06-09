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
      await testSubjects.existOrFail('ml_calendars_mng_button');
    },

    async assertSettingsCreateCalendarLinkExists() {
      await testSubjects.existOrFail('ml_calendars_create_button');
    },

    async assertSettingsManageFilterListsLinkExists() {
      await testSubjects.existOrFail('ml_filter_lists_mng_button');
    },

    async assertSettingsCreateFilterListLinkExists() {
      await testSubjects.existOrFail('ml_filter_lists_create_button');
    },
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningSettingsProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertSettingsCalendarLinkExists() {
      await testSubjects.existOrFail('ml_calendar_mng_button');
    },

    async assertSettingsFilterlistLinkExists() {
      await testSubjects.existOrFail('ml_filter_lists_button');
    },
  };
}

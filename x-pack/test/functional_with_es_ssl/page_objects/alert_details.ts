/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function AlertDetailsPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async getHeadingText() {
      return await testSubjects.getVisibleText('alertDetailsTitle');
    },
    async getAlertType() {
      return await testSubjects.getVisibleText('alertTypeLabel');
    },
    async getActionsLabels() {
      return {
        actionType: await testSubjects.getVisibleText('actionTypeLabel'),
        actionCount: await testSubjects.getVisibleText('actionCountLabel'),
      };
    },
  };
}

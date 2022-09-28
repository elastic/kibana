/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommonUI } from './common_ui';
import { MlTableService } from './common_table_service';

export function NotificationsProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI,
  tableService: MlTableService
) {
  const testSubjects = getService('testSubjects');

  return {
    async assertNotificationIndicatorExist(expectExist = true) {
      if (expectExist) {
        await testSubjects.existOrFail('mlNotificationsIndicator');
      } else {
        await testSubjects.missingOrFail('mlNotificationsIndicator');
      }
    },

    async assertNotificationErrorsCount(expectedCount: number) {
      const actualCount = await testSubjects.getVisibleText('mlNotificationErrorsIndicator');
      expect(actualCount).to.greaterThan(expectedCount);
    },

    table: tableService.getServiceInstance(
      'NotificationsTable',
      'mlNotificationsTable',
      'mlNotificationsTableRow',
      [
        { id: 'timestamp', testSubj: 'mlNotificationTime' },
        { id: 'level', testSubj: 'mlNotificationLevel' },
        { id: 'job_type', testSubj: 'mlNotificationType' },
        { id: 'job_id', testSubj: 'mlNotificationEntity' },
        { id: 'message', testSubj: 'mlNotificationMessage' },
      ],
      'mlNotificationsSearchBarInput'
    ),
  };
}

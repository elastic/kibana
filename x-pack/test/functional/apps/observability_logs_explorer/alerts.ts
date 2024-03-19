/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from './config';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['observabilityLogsExplorer']);
  const testSubjects = getService('testSubjects');

  describe('Alerts dropdown menu', () => {
    before(async () => {
      await PageObjects.observabilityLogsExplorer.navigateTo();
    });

    it('should create rule successfully', async () => {
      await testSubjects.clickWhenNotDisabled('observabilityLogsExplorerAlertsPopoverToggleButton');
      await testSubjects.click('observabilityLogsExplorerCreateRuleMenuItem');
      await testSubjects.setValue('ruleNameInput', 'Test rule');
      await testSubjects.click('saveRuleButton');
      await testSubjects.click('confirmModalConfirmButton');
      await testSubjects.waitForDeleted('saveRuleButton');
      await testSubjects.waitForDeleted('confirmModalConfirmButton');
    });

    it('should create SLO successfully', async () => {
      await testSubjects.clickWhenNotDisabled('observabilityLogsExplorerAlertsPopoverToggleButton');
      await testSubjects.click('observabilityLogsExplorerCreateSLOMenuItem');
      await testSubjects.setValue('customKqlIndicatorFormGoodQueryInput', '@timestamp >= 0');
      await testSubjects.setValue('sloFormNameInput', 'Test SLO');
      await testSubjects.click('sloFormSubmitButton');
      await testSubjects.waitForDeleted('sloFormSubmitButton');
    });
  });
}

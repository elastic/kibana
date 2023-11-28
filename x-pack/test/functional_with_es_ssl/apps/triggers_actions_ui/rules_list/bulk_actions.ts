/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { createAlert, scheduleRule, snoozeAlert } from '../../../lib/alert_api_actions';
import { ObjectRemover } from '../../../lib/object_remover';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const supertest = getService('supertest');
  const retry = getService('retry');
  const objectRemover = new ObjectRemover(supertest);

  async function refreshAlertsList() {
    await testSubjects.click('logsTab');
    await testSubjects.click('rulesTab');
  }

  describe('rules list', () => {
    before(async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('rulesTab');
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('should allow rules to be snoozed', async () => {
      const rule1 = await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'a' },
      });
      const rule2 = await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'b' },
      });

      await refreshAlertsList();
      await testSubjects.click(`checkboxSelectRow-${rule1.id}`);
      await testSubjects.click(`checkboxSelectRow-${rule2.id}`);
      await testSubjects.click('showBulkActionButton');
      await testSubjects.click('bulkSnooze');
      await testSubjects.existOrFail('snoozePanel');
      await testSubjects.click('linkSnooze1h');

      await retry.try(async () => {
        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql('Updated snooze settings for 2 rules.');
      });

      await pageObjects.triggersActionsUI.searchAlerts(rule1.name);
      await testSubjects.existOrFail('rulesListNotifyBadge-snoozed');
      await pageObjects.triggersActionsUI.searchAlerts(rule2.name);
      await testSubjects.existOrFail('rulesListNotifyBadge-snoozed');
    });

    it('should allow rules to be unsnoozed', async () => {
      const rule1 = await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'a' },
      });
      await snoozeAlert({
        supertest,
        alertId: rule1.id,
      });
      const rule2 = await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'b' },
      });
      await snoozeAlert({
        supertest,
        alertId: rule2.id,
      });

      await refreshAlertsList();
      await testSubjects.click(`checkboxSelectRow-${rule1.id}`);
      await testSubjects.click(`checkboxSelectRow-${rule2.id}`);
      await testSubjects.click('showBulkActionButton');
      await testSubjects.click('bulkUnsnooze');
      await testSubjects.existOrFail('bulkUnsnoozeConfirmationModal');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql('Updated snooze settings for 2 rules.');
      });

      await pageObjects.triggersActionsUI.searchAlerts(rule1.name);
      await testSubjects.missingOrFail('rulesListNotifyBadge-snoozed');
      await pageObjects.triggersActionsUI.searchAlerts(rule2.name);
      await testSubjects.missingOrFail('rulesListNotifyBadge-snoozed');
    });

    it('should allow rules to be scheduled', async () => {
      const rule1 = await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'a' },
      });
      const rule2 = await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'b' },
      });

      await refreshAlertsList();
      await testSubjects.click(`checkboxSelectRow-${rule1.id}`);
      await testSubjects.click(`checkboxSelectRow-${rule2.id}`);
      await testSubjects.click('showBulkActionButton');
      await testSubjects.click('bulkSnoozeSchedule');
      await testSubjects.existOrFail('ruleSnoozeScheduler');
      await testSubjects.click('scheduler-saveSchedule');

      await retry.try(async () => {
        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql('Updated snooze settings for 2 rules.');
      });

      await pageObjects.triggersActionsUI.searchAlerts(rule1.name);
      await testSubjects.existOrFail('rulesListNotifyBadge-scheduled');
      await pageObjects.triggersActionsUI.searchAlerts(rule2.name);
      await testSubjects.existOrFail('rulesListNotifyBadge-scheduled');
    });

    it('should allow rules to be unscheduled', async () => {
      const rule1 = await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'a' },
      });
      await scheduleRule({
        supertest,
        ruleId: rule1.id,
      });
      const rule2 = await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'b' },
      });
      await scheduleRule({
        supertest,
        ruleId: rule2.id,
      });

      await refreshAlertsList();
      await testSubjects.click(`checkboxSelectRow-${rule1.id}`);
      await testSubjects.click(`checkboxSelectRow-${rule2.id}`);
      await testSubjects.click('showBulkActionButton');
      await testSubjects.click('bulkRemoveSnoozeSchedule');
      await testSubjects.existOrFail('bulkRemoveScheduleConfirmationModal');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql('Updated snooze settings for 2 rules.');
      });

      await pageObjects.triggersActionsUI.searchAlerts(rule1.name);
      await testSubjects.missingOrFail('rulesListNotifyBadge-scheduled');
      await pageObjects.triggersActionsUI.searchAlerts(rule2.name);
      await testSubjects.missingOrFail('rulesListNotifyBadge-scheduled');
    });

    it('can bulk update API key', async () => {
      const rule1 = await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'a' },
      });
      const rule2 = await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'b' },
      });

      await refreshAlertsList();
      await testSubjects.click(`checkboxSelectRow-${rule1.id}`);
      await testSubjects.click('selectAllRulesButton');
      await testSubjects.click(`checkboxSelectRow-${rule2.id}`);
      await testSubjects.click('showBulkActionButton');
      await testSubjects.click('updateAPIKeys');
      await testSubjects.existOrFail('updateApiKeyIdsConfirmation');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql('Updated API key for 1 rule.');
      });
    });
  });
};

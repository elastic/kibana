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
import {
  createAlert,
  createAlertManualCleanup,
  scheduleRule,
  snoozeAlert,
} from '../../../lib/alert_api_actions';
import { ObjectRemover } from '../../../lib/object_remover';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const supertest = getService('supertest');
  const retry = getService('retry');
  const objectRemover = new ObjectRemover(supertest);
  const toasts = getService('toasts');

  async function refreshAlertsList() {
    await testSubjects.click('logsTab');
    await testSubjects.click('rulesTab');
  }

  // Failing: See https://github.com/elastic/kibana/issues/177130
  describe.skip('rules list bulk actions', () => {
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
        const toastTitle = await toasts.getTitleAndDismiss();
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
        const toastTitle = await toasts.getTitleAndDismiss();
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
        const toastTitle = await toasts.getTitleAndDismiss();
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
        const toastTitle = await toasts.getTitleAndDismiss();
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
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql('Updated API key for 1 rule.');
      });
    });

    it('should apply filters to bulk actions when using the select all button', async () => {
      const rule1 = await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'a' },
      });
      const rule2 = await createAlertManualCleanup({
        supertest,
        overwrites: { name: 'b', rule_type_id: 'test.always-firing' },
      });
      const rule3 = await createAlert({
        supertest,
        objectRemover,
        overwrites: { name: 'c' },
      });

      await refreshAlertsList();
      expect(await testSubjects.getVisibleText('totalRulesCount')).to.be('3 rules');

      await testSubjects.click('ruleTypeFilterButton');
      await testSubjects.existOrFail('ruleTypetest.noopFilterOption');
      await testSubjects.click('ruleTypetest.noopFilterOption');
      await testSubjects.click(`checkboxSelectRow-${rule1.id}`);
      await testSubjects.click('selectAllRulesButton');

      await testSubjects.click('showBulkActionButton');
      await testSubjects.click('bulkDisable');
      await testSubjects.existOrFail('untrackAlertsModal');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql('Disabled 2 rules');
      });

      await testSubjects.click('rules-list-clear-filter');
      await refreshAlertsList();

      await pageObjects.triggersActionsUI.searchAlerts(rule1.name);
      expect(await testSubjects.getVisibleText('statusDropdown')).to.be('Disabled');
      await pageObjects.triggersActionsUI.searchAlerts(rule2.name);
      expect(await testSubjects.getVisibleText('statusDropdown')).to.be('Enabled');
      await pageObjects.triggersActionsUI.searchAlerts(rule3.name);
      expect(await testSubjects.getVisibleText('statusDropdown')).to.be('Disabled');

      await testSubjects.click('rules-list-clear-filter');
      await refreshAlertsList();

      await testSubjects.click('ruleStatusFilterButton');
      await testSubjects.existOrFail('ruleStatusFilterOption-enabled');
      await testSubjects.click('ruleStatusFilterOption-enabled');
      await testSubjects.click(`checkboxSelectRow-${rule2.id}`);
      await testSubjects.click('selectAllRulesButton');

      await testSubjects.click('showBulkActionButton');
      await testSubjects.click('bulkDelete');
      await testSubjects.existOrFail('rulesDeleteConfirmation');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql('Deleted 1 rule');
      });

      await testSubjects.click('rules-list-clear-filter');
      await refreshAlertsList();

      await retry.try(
        async () => {
          expect(await testSubjects.getVisibleText('totalRulesCount')).to.be('2 rules');
        },
        async () => {
          // If the delete fails, make sure rule2 gets cleaned up
          objectRemover.add(rule2.id, 'alert', 'alerts');
        }
      );
    });
  });
};

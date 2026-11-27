/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import type { KibanaRole } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { OBSERVABILITY_OWNER } from '@kbn/cases-plugin/common';
import { test } from '../fixtures';
import {
  setAlertingV2EnabledSetting,
  unsetAlertingV2EnabledSetting,
} from '../fixtures/alerting_v2_setting';
import {
  ADD_TO_CASE_ALERT_COUNT,
  ADD_TO_CASE_DATA_VIEW_ID,
  ADD_TO_CASE_RULE_NAME,
  ADD_TO_CASE_SOURCE_INDEX,
  createAddToCaseRule,
  createAddToCaseSourceIndex,
  deleteAddToCaseAlerts,
  deleteAddToCaseSourceIndex,
  LOGS_READ_WITH_CASES_ROLE,
  LOGS_READ_WITHOUT_CASES_ROLE,
} from '../fixtures/add_to_case_test_data';
import { deleteV1PrivilegeRule } from '../fixtures/privilege_test_data';
import type { ObservabilityAlertingPage } from '../fixtures/page_objects';

const CASE_TAGS = ['scout-add-to-case'];

const CASE_PAYLOAD = {
  description: 'Case created by the add to case Scout suite',
  tags: CASE_TAGS,
  connector: { id: 'none', name: 'none', type: '.none', fields: null },
  settings: { syncAlerts: false, extractObservables: false },
  owner: OBSERVABILITY_OWNER,
};

test.describe(
  'Observability Alerting - add to case for classic alerts',
  { tag: tags.stateful.classic },
  () => {
    let ruleId: string;

    const openSeededAlerts = async (observabilityAlerting: ObservabilityAlertingPage) => {
      await observabilityAlerting.gotoInboxFilteredByRule(ruleId);
      await expect(observabilityAlerting.episodesItemCount).toHaveText(
        `Showing ${ADD_TO_CASE_ALERT_COUNT} alerts`,
        { timeout: 60_000 }
      );
      await expect(observabilityAlerting.episodeRows(ADD_TO_CASE_RULE_NAME)).toHaveCount(
        ADD_TO_CASE_ALERT_COUNT
      );
    };

    const loginAndOpen = async (
      browserAuth: { loginWithCustomRole: (role: KibanaRole) => Promise<void> },
      observabilityAlerting: ObservabilityAlertingPage,
      role: KibanaRole
    ) => {
      await browserAuth.loginWithCustomRole(role);
      await openSeededAlerts(observabilityAlerting);
    };

    test.beforeAll(async ({ apiServices, esClient, kbnClient }) => {
      test.setTimeout(180_000);
      await setAlertingV2EnabledSetting(kbnClient, true);
      await deleteAddToCaseAlerts(esClient);
      await createAddToCaseSourceIndex(esClient);
      await apiServices.dataViews.create({
        id: ADD_TO_CASE_DATA_VIEW_ID,
        name: ADD_TO_CASE_DATA_VIEW_ID,
        title: ADD_TO_CASE_SOURCE_INDEX,
        timeFieldName: '@timestamp',
        override: true,
      });
      ruleId = await createAddToCaseRule({ apiServices, esClient });
    });

    test.afterAll(async ({ apiServices, esClient, kbnClient }) => {
      if (ruleId) {
        await deleteV1PrivilegeRule(kbnClient, ruleId);
      }
      await deleteAddToCaseAlerts(esClient);
      await apiServices.cases.cleanup.deleteCasesByTags(CASE_TAGS);
      await apiServices.dataViews.delete(ADD_TO_CASE_DATA_VIEW_ID).catch(() => undefined);
      await deleteAddToCaseSourceIndex(esClient);
      await unsetAlertingV2EnabledSetting(kbnClient);
    });

    test('adds an alert to a new case from the row action', async ({
      apiServices,
      browserAuth,
      pageObjects: { addToCaseModal, observabilityAlerting },
    }) => {
      const title = `Add to case row new ${Date.now()}`;

      await loginAndOpen(browserAuth, observabilityAlerting, LOGS_READ_WITH_CASES_ROLE);
      await observabilityAlerting.clickAddToCaseRowAction(ADD_TO_CASE_RULE_NAME);
      await addToCaseModal.createCase(title, CASE_PAYLOAD.description);

      await expect
        .poll(async () => {
          const { data: cases } = await apiServices.cases.find({ search: title });
          return cases.find((theCase) => theCase.title === title)?.totalAlerts;
        })
        .toBe(1);
    });

    test('adds an alert to an existing case from the row action', async ({
      apiServices,
      browserAuth,
      pageObjects: { addToCaseModal, observabilityAlerting },
    }) => {
      const { data: existingCase } = await apiServices.cases.create({
        ...CASE_PAYLOAD,
        title: `Add to case row existing ${Date.now()}`,
      });

      await loginAndOpen(browserAuth, observabilityAlerting, LOGS_READ_WITH_CASES_ROLE);
      await observabilityAlerting.clickAddToCaseRowAction(ADD_TO_CASE_RULE_NAME);
      await addToCaseModal.selectExistingCase(existingCase.id);

      await expect
        .poll(async () => (await apiServices.cases.get(existingCase.id)).data.totalAlerts)
        .toBe(1);
    });

    test('adds the selected alerts to a new case from the bulk action', async ({
      apiServices,
      browserAuth,
      pageObjects: { addToCaseModal, observabilityAlerting },
    }) => {
      const title = `Add to case bulk new ${Date.now()}`;

      await loginAndOpen(browserAuth, observabilityAlerting, LOGS_READ_WITH_CASES_ROLE);
      await observabilityAlerting.selectAllRows(ADD_TO_CASE_ALERT_COUNT);
      await observabilityAlerting.clickAddToCaseBulkAction();
      await addToCaseModal.createCase(title, CASE_PAYLOAD.description);

      await expect
        .poll(async () => {
          const { data: cases } = await apiServices.cases.find({ search: title });
          return cases.find((theCase) => theCase.title === title)?.totalAlerts;
        })
        .toBe(ADD_TO_CASE_ALERT_COUNT);
    });

    test('adds the selected alerts to an existing case, which is then offered as already attached', async ({
      apiServices,
      browserAuth,
      pageObjects: { addToCaseModal, observabilityAlerting },
    }) => {
      const { data: existingCase } = await apiServices.cases.create({
        ...CASE_PAYLOAD,
        title: `Add to case bulk existing ${Date.now()}`,
      });

      await test.step('attaches every selected alert', async () => {
        await loginAndOpen(browserAuth, observabilityAlerting, LOGS_READ_WITH_CASES_ROLE);
        await observabilityAlerting.selectAllRows(ADD_TO_CASE_ALERT_COUNT);
        await observabilityAlerting.clickAddToCaseBulkAction();
        await addToCaseModal.selectExistingCase(existingCase.id);

        await expect
          .poll(async () => (await apiServices.cases.get(existingCase.id)).data.totalAlerts)
          .toBe(ADD_TO_CASE_ALERT_COUNT);
      });

      await test.step('disables the case once every selected alert is attached', async () => {
        await openSeededAlerts(observabilityAlerting);
        await observabilityAlerting.selectAllRows(ADD_TO_CASE_ALERT_COUNT);
        await observabilityAlerting.clickAddToCaseBulkAction();

        await expect(addToCaseModal.modal).toBeVisible();
        await expect(addToCaseModal.caseSelectButton(existingCase.id)).toBeDisabled();
      });
    });

    test('skips the alerts already attached to the chosen case', async ({
      apiServices,
      browserAuth,
      page,
      pageObjects: { addToCaseModal, observabilityAlerting },
    }) => {
      const { data: existingCase } = await apiServices.cases.create({
        ...CASE_PAYLOAD,
        title: `Add to case skip attached ${Date.now()}`,
      });

      await loginAndOpen(browserAuth, observabilityAlerting, LOGS_READ_WITH_CASES_ROLE);

      await test.step('attaches the first alert', async () => {
        await observabilityAlerting.clickAddToCaseRowAction(ADD_TO_CASE_RULE_NAME);
        await addToCaseModal.selectExistingCase(existingCase.id);
        await expect
          .poll(async () => (await apiServices.cases.get(existingCase.id)).data.totalAlerts)
          .toBe(1);
      });

      await test.step('sends only the alert that is not attached yet', async () => {
        // Reloading re-reads `kibana.alert.case_ids` from the alert documents.
        await openSeededAlerts(observabilityAlerting);
        await observabilityAlerting.selectAllRows(ADD_TO_CASE_ALERT_COUNT);
        await observabilityAlerting.clickAddToCaseBulkAction();

        const attachRequest = page.waitForRequest(
          (request) =>
            request.method() === 'POST' && request.url().includes('/attachments/_bulk_create')
        );
        await addToCaseModal.selectExistingCase(existingCase.id);

        const attachments: Array<{ attachmentId: string[] }> = (await attachRequest).postDataJSON();
        expect(attachments.flatMap(({ attachmentId }) => attachmentId)).toHaveLength(1);
        await expect
          .poll(async () => (await apiServices.cases.get(existingCase.id)).data.totalAlerts)
          .toBe(ADD_TO_CASE_ALERT_COUNT);
      });
    });

    test('hides the add to case actions without cases privileges', async ({
      browserAuth,
      pageObjects: { observabilityAlerting },
    }) => {
      await loginAndOpen(browserAuth, observabilityAlerting, LOGS_READ_WITHOUT_CASES_ROLE);
      await expect(observabilityAlerting.addToCaseRowControl).toHaveCount(0);

      await observabilityAlerting.selectAllRows(ADD_TO_CASE_ALERT_COUNT);
      await observabilityAlerting.bulkActionsMenuButton.click();
      await expect(observabilityAlerting.addToCaseBulkAction).toHaveCount(0);
    });
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { test } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  CPS_TAGS,
  SPACE_PROJECT_ROUTING_ORIGIN_ONLY,
  SPACE_PROJECT_ROUTING_ALL,
  createMarkerFieldIndex,
  createCpsSpace,
  deleteCpsSpace,
  deleteTestIndices,
} from '../../../../shared/cps_helpers';

/**
 * CPS field dropdown scoping POC.
 *
 * Validates that field autocomplete dropdowns (e.g. threat match mapping fields)
 * respect the CPS project routing of the Kibana space. In an origin-only space
 * (`_alias:_origin`), dropdowns should list fields from the origin cluster only.
 * In an all-projects space (`_alias:*`), fields from both clusters should appear.
 *
 * Requires:
 *   node scripts/scout start-server --arch serverless --domain security_complete --serverConfigSet cps_local
 */

const ORIGIN_MARKER_FIELD = 'origin_marker';
const LINKED_MARKER_FIELD = 'linked_marker';

/**
 * Navigate to rule creation within a specific space, select Indicator Match rule
 * type, enter the threat index, and return a locator for the threat field combobox.
 */
const navigateToThreatMatchForm = async (params: {
  page: Parameters<Parameters<typeof test>[2]>[0]['page'];
  kbnUrl: Parameters<Parameters<typeof test>[2]>[0]['kbnUrl'];
  spaceId: string;
  testIndex: string;
}) => {
  const { page, kbnUrl, spaceId, testIndex } = params;

  await page.goto(kbnUrl.app('security/rules/create', { space: spaceId }));

  await page.testSubj.waitForSelector('threatMatchRuleType', {
    state: 'visible',
    timeout: 30_000,
  });
  await page.testSubj.click('threatMatchRuleType');

  const threatIndexField = page.testSubj.locator('ruleThreatMatchIndicesField');
  await threatIndexField.locator('input').fill(testIndex);
  await page.keyboard.press('Enter');

  const threatFieldRow = page.testSubj.locator('threatFieldInputFormRow');
  const fieldComboBox = threatFieldRow.locator('[data-test-subj="fieldAutocompleteComboBox"]');
  await fieldComboBox.waitFor({ state: 'visible', timeout: 15_000 });

  return { fieldComboBox };
};

/**
 * Type a field name into an EsFieldSelector combobox and return the matching
 * option locator for the caller to assert on.
 */
const getFieldDropdownOption = async (params: {
  comboBox: ReturnType<Parameters<Parameters<typeof test>[2]>[0]['page']['locator']>;
  page: Parameters<Parameters<typeof test>[2]>[0]['page'];
  fieldName: string;
}) => {
  const { comboBox, page, fieldName } = params;

  await comboBox.locator('input').click();
  await comboBox.locator('input').fill(fieldName);

  return page.locator('[role="option"]').filter({ hasText: fieldName });
};

test.describe('CPS field dropdown scoping - threat match mapping fields', { tag: CPS_TAGS }, () => {
  const runId = randomUUID().slice(0, 8);
  const testIndex = `scout-cps-ui-${runId}`;

  test.beforeAll(async ({ esClient, linkedProject }) => {
    await createMarkerFieldIndex({
      esClient,
      index: testIndex,
      markerField: ORIGIN_MARKER_FIELD,
    });
    await createMarkerFieldIndex({
      esClient: linkedProject.esClient,
      index: testIndex,
      markerField: LINKED_MARKER_FIELD,
    });
  });

  test.afterAll(async ({ esClient, linkedProject }) => {
    await deleteTestIndices({ esClient, linkedEs: linkedProject.esClient, index: testIndex });
  });

  test('origin-only space: threat field dropdown shows origin fields but not linked fields', async ({
    page,
    kbnUrl,
    kbnClient,
    browserAuth,
  }) => {
    const spaceId = `cps-ui-tm-orig-${runId}`;

    await createCpsSpace({
      kbnClient,
      spaceId,
      projectRouting: SPACE_PROJECT_ROUTING_ORIGIN_ONLY,
    });

    try {
      await browserAuth.loginAsAdmin();
      const { fieldComboBox } = await navigateToThreatMatchForm({
        page,
        kbnUrl,
        spaceId,
        testIndex,
      });

      await test.step('origin_marker field is available', async () => {
        const option = await getFieldDropdownOption({
          comboBox: fieldComboBox,
          page,
          fieldName: ORIGIN_MARKER_FIELD,
        });
        await expect(option).toBeVisible({ timeout: 15_000 });
      });

      await test.step('linked_marker field is NOT available', async () => {
        const option = await getFieldDropdownOption({
          comboBox: fieldComboBox,
          page,
          fieldName: LINKED_MARKER_FIELD,
        });
        await expect(option).toHaveCount(0, { timeout: 5_000 });
      });
    } finally {
      await deleteCpsSpace({ kbnClient, spaceId });
    }
  });

  test('all-projects space: threat field dropdown shows fields from both origin and linked clusters', async ({
    page,
    kbnUrl,
    kbnClient,
    browserAuth,
  }) => {
    const spaceId = `cps-ui-tm-all-${runId}`;

    await createCpsSpace({
      kbnClient,
      spaceId,
      projectRouting: SPACE_PROJECT_ROUTING_ALL,
    });

    try {
      await browserAuth.loginAsAdmin();
      const { fieldComboBox } = await navigateToThreatMatchForm({
        page,
        kbnUrl,
        spaceId,
        testIndex,
      });

      await test.step('origin_marker field is available', async () => {
        const option = await getFieldDropdownOption({
          comboBox: fieldComboBox,
          page,
          fieldName: ORIGIN_MARKER_FIELD,
        });
        await expect(option).toBeVisible({ timeout: 15_000 });
      });

      await test.step('linked_marker field is also available', async () => {
        const option = await getFieldDropdownOption({
          comboBox: fieldComboBox,
          page,
          fieldName: LINKED_MARKER_FIELD,
        });
        await expect(option).toBeVisible({ timeout: 15_000 });
      });
    } finally {
      await deleteCpsSpace({ kbnClient, spaceId });
    }
  });
});

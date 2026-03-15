/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules, startBasicLicense } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewEqlRule, getNewIndicatorMatchRule } from '../../../common/rule_objects';

test.describe('Basic license check rule details', { tag: [...tags.stateful.classic] }, () => {
  const SUPPRESS_BY_FIELDS = ['myhash.mysha256', 'source.ip.keyword'];

  test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
    await browserAuth.loginAsAdmin();
    await deleteAlertsAndRules(apiServices);
    await startBasicLicense(kbnClient);
  });

  test('Shows upselling message for indicator match rule on basic license', async ({
    page,
    pageObjects,
    kbnClient,
  }) => {
    const rule = getNewIndicatorMatchRule();
    const created = await createRuleFromParams(kbnClient, {
      ...rule,
      alert_suppression: {
        group_by: SUPPRESS_BY_FIELDS,
        duration: { value: 360, unit: 's' },
        missing_fields_strategy: 'doNotSuppress',
      },
    });

    await pageObjects.ruleDetails.goto(created.id);

    const definitionDetails = page.testSubj.locator('definitionRule');
    await expect(definitionDetails).toBeVisible();

    await expect(definitionDetails.getByText(SUPPRESS_BY_FIELDS.join(''))).toBeVisible();
    await expect(definitionDetails.getByText('360s')).toBeVisible();
    await expect(
      definitionDetails.getByText('Do not suppress alerts for events with missing fields')
    ).toBeVisible();

    const insufficientLicenseIcon = page.testSubj.locator(
      'alertSuppressionInsufficientLicensingIcon'
    );
    await insufficientLicenseIcon.last().hover();
    await expect(page.getByRole('tooltip')).toContainText(
      'Alert suppression is configured but will not be applied due to insufficient licensing'
    );
  });

  test('Shows upselling message for EQL rule on basic license', async ({
    page,
    pageObjects,
    kbnClient,
  }) => {
    const rule = getNewEqlRule();
    const created = await createRuleFromParams(kbnClient, {
      ...rule,
      alert_suppression: {
        group_by: SUPPRESS_BY_FIELDS,
        duration: { value: 360, unit: 's' },
        missing_fields_strategy: 'doNotSuppress',
      },
    });

    await pageObjects.ruleDetails.goto(created.id);

    const definitionDetails = page.testSubj.locator('definitionRule');
    await expect(definitionDetails).toBeVisible();

    await expect(definitionDetails.getByText(SUPPRESS_BY_FIELDS.join(''))).toBeVisible();
    await expect(definitionDetails.getByText('360s')).toBeVisible();
    await expect(
      definitionDetails.getByText('Do not suppress alerts for events with missing fields')
    ).toBeVisible();

    const insufficientLicenseIcon = page.testSubj.locator(
      'alertSuppressionInsufficientLicensingIcon'
    );
    await insufficientLicenseIcon.last().hover();
    await expect(page.getByRole('tooltip')).toContainText(
      'Alert suppression is configured but will not be applied due to insufficient licensing'
    );
  });
});

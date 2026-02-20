/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// FLAKY: https://github.com/elastic/kibana/issues/181008

import { test, expect, tags } from '../../../fixtures';
import { ALERTS_URL, RULES_MANAGEMENT_URL } from '../../../common/urls';

const CREATE_RULE_URL = '/app/security/rules/create';
const LEGACY_DETECTIONS_URL_1 = '/app/siem#/detections';
const LEGACY_DETECTIONS_URL_2 = '/app/security/detections';
const LEGACY_DETECTIONS_RULES_URL = '/app/security/detections/rules';
const LEGACY_DETECTIONS_CREATE_RULE_URL = '/app/security/detections/rules/create';
const LEGACY_RULE_DETAILS_URL = '/app/security/detections/rules/id/5a4a0460-d822-11eb-8962-bfd4aff0a9b3';
const LEGACY_RULE_EDIT_URL = '/app/security/detections/rules/id/5a4a0460-d822-11eb-8962-bfd4aff0a9b3/edit';
const ABSOLUTE_DATE_RANGE_URL =
  '/app/security/network/flows/?timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))';
const ABSOLUTE_DATE = {
  endTime: 'Aug 1, 2019 @ 20:33:29.186',
  startTime: 'Aug 1, 2019 @ 20:03:29.186',
};

test.describe.skip(
  'URL compatibility',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('Redirects to alerts from old siem Detections URL', async ({ pageObjects, page }) => {
      await pageObjects.explore.gotoUrl(LEGACY_DETECTIONS_URL_1);
      await expect(page).toHaveURL(new RegExp(ALERTS_URL.replace(/\//g, '\\/')));
    });

    test('Redirects to alerts from old Detections URL', async ({ pageObjects, page }) => {
      await pageObjects.explore.gotoUrl(LEGACY_DETECTIONS_URL_2);
      await expect(page).toHaveURL(new RegExp(ALERTS_URL.replace(/\//g, '\\/')));
    });

    test('Redirects to rules from old Detections rules URL', async ({ pageObjects, page }) => {
      await pageObjects.explore.gotoUrl(LEGACY_DETECTIONS_RULES_URL);
      await expect(page).toHaveURL(new RegExp(RULES_MANAGEMENT_URL.replace(/\//g, '\\/')));
    });

    test('Redirects to rules creation from old Detections rules creation URL', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.explore.gotoUrl(LEGACY_DETECTIONS_CREATE_RULE_URL);
      await expect(page).toHaveURL(new RegExp(CREATE_RULE_URL.replace(/\//g, '\\/')));
    });

    test('Redirects to rule details from old Detections rule details URL', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.explore.gotoUrl(LEGACY_RULE_DETAILS_URL);
      await expect(page).toHaveURL(/rules\/id\/5a4a0460-d822-11eb-8962-bfd4aff0a9b3/);
    });

    test('Redirects to rule details alerts tab from old Detections rule details URL', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.explore.gotoUrl(LEGACY_RULE_DETAILS_URL);
      await expect(page).toHaveURL(/rules\/id\/5a4a0460-d822-11eb-8962-bfd4aff0a9b3/);
    });

    test('Redirects to rule edit from old Detections rule edit URL', async ({ pageObjects, page }) => {
      await pageObjects.explore.gotoUrl(LEGACY_RULE_EDIT_URL);
      await expect(page).toHaveURL(/rules\/id\/5a4a0460-d822-11eb-8962-bfd4aff0a9b3\/edit/);
    });

    test('sets the global start and end dates from the url with timestamps', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.explore.gotoUrl(ABSOLUTE_DATE_RANGE_URL);
      const startDateBtn = page.testSubj.locator('superDatePickerstartDatePopoverButton');
      await expect(startDateBtn.first()).toHaveAttribute('title', ABSOLUTE_DATE.startTime);
      const endDateBtn = page.testSubj.locator('superDatePickerendDatePopoverButton');
      await expect(endDateBtn.first()).toHaveAttribute('title', ABSOLUTE_DATE.endTime);
    });
  }
);

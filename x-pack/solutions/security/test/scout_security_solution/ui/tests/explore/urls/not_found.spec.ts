/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import {
  ALERTS_URL,
  EXCEPTIONS_URL,
  RULES_MANAGEMENT_URL,
  TIMELINES_URL,
} from '../../../common/urls';

const CREATE_RULE_URL = '/app/security/rules/create';
const ENDPOINTS_URL = '/app/security/administration/endpoints';
const TRUSTED_APPS_URL = '/app/security/administration/trusted_apps';
const EVENT_FILTERS_URL = '/app/security/administration/event_filters';
const MOCK_RULE_ID = '5a4a0460-d822-11eb-8962-bfd4aff0a9b3';

test.describe(
  'Display not found page',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.explore.gotoWithTimeRange(TIMELINES_URL);
    });

    test('navigates to the alerts page with incorrect link', async ({ pageObjects }) => {
      await pageObjects.explore.gotoWithTimeRange(`${ALERTS_URL}/randomUrl`);
      await expect(pageObjects.explore.notFoundPage.first()).toBeVisible();
    });

    test('navigates to the exceptions page with incorrect link', async ({ pageObjects }) => {
      await pageObjects.explore.gotoWithTimeRange(`${EXCEPTIONS_URL}/randomUrl`);
      await expect(pageObjects.explore.notFoundPage.first()).toBeVisible();
    });

    test('navigates to the rules page with incorrect link', async ({ pageObjects }) => {
      await pageObjects.explore.gotoWithTimeRange(`${RULES_MANAGEMENT_URL}/randomUrl`);
      await expect(pageObjects.explore.notFoundPage.first()).toBeVisible();
    });

    test('navigates to the rules creation page with incorrect link', async ({ pageObjects }) => {
      await pageObjects.explore.gotoWithTimeRange(`${CREATE_RULE_URL}/randomUrl`);
      await expect(pageObjects.explore.notFoundPage.first()).toBeVisible();
    });

    test('navigates to the rules details page with incorrect link', async ({ pageObjects }) => {
      await pageObjects.explore.gotoWithTimeRange(
        `/app/security/rules/id/${MOCK_RULE_ID}/randomUrl`
      );
      await expect(pageObjects.explore.notFoundPage.first()).toBeVisible();
    });

    test('navigates to the edit rules page with incorrect link', async ({ pageObjects }) => {
      await pageObjects.explore.gotoWithTimeRange(
        `/app/security/rules/id/${MOCK_RULE_ID}/edit/randomUrl`
      );
      await expect(pageObjects.explore.notFoundPage.first()).toBeVisible();
    });

    test('navigates to the endpoints page with incorrect link', async ({ pageObjects }) => {
      await pageObjects.explore.gotoWithTimeRange(`${ENDPOINTS_URL}/randomUrl`);
      await expect(pageObjects.explore.notFoundPage.first()).toBeVisible();
    });

    test('navigates to the trusted applications page with incorrect link', async ({
      pageObjects,
    }) => {
      await pageObjects.explore.gotoWithTimeRange(`${TRUSTED_APPS_URL}/randomUrl`);
      await expect(pageObjects.explore.notFoundPage.first()).toBeVisible();
    });

    test('navigates to the event filters page with incorrect link', async ({ pageObjects }) => {
      await pageObjects.explore.gotoWithTimeRange(`${EVENT_FILTERS_URL}/randomUrl`);
      await expect(pageObjects.explore.notFoundPage.first()).toBeVisible();
    });
  }
);

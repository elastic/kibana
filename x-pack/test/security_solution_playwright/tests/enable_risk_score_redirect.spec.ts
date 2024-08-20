/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '../fixtures/es_archiver';
import { PageFactory } from '../page_objects/page_factory';
import { EntityAnalyticsPage } from '../page_objects/entity_analytics_po';
import { EntityAnalyticsManagementPage } from '../page_objects/entity_analytics_management_po';

let entityAnalyticsPage: EntityAnalyticsPage;
let entityAnalyticsManagementPage: EntityAnalyticsManagementPage;

test.beforeAll(async ({ esArchiver }) => {
  await esArchiver.loadIfNeeded('auditbeat_single');
});
test.afterAll(async ({ esArchiver }) => {
  await esArchiver.unload('auditbeat_single');
});

test.describe('Enable risk scores from dashboard', () => {
  test.beforeEach(async ({ page }) => {
    entityAnalyticsPage = await PageFactory.createEntityAnalyticsPage(page);
    entityAnalyticsPage.navigates();
  });
  test.use({ storageState: '.auth/user.json' });

  test('host risk enable button should redirect to entity management page', async ({ page }) => {
    await entityAnalyticsPage.waitForEnableHostRiskScoreToBePresent();
    entityAnalyticsManagementPage = await entityAnalyticsPage.enableHostRisk();
    entityAnalyticsManagementPage.entityAnalyticsManagementPageTitleShouldBeDisplayed();
  });

  test('user risk enable button should redirect to entity management page', async ({ page }) => {
    await entityAnalyticsPage.waitForEnableUserRiskScoreToBePresent();
    entityAnalyticsManagementPage = await entityAnalyticsPage.enableUserRisk();
    entityAnalyticsManagementPage.entityAnalyticsManagementPageTitleShouldBeDisplayed();
  });
});

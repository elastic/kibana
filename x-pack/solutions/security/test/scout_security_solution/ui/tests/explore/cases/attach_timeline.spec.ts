/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAllCases } from '../../../common/api_helpers';
import { test, expect, tags } from '../../../fixtures';
import { createTimeline, deleteTimelines } from '../../../common/timeline_api_helpers';

const mockTimeline = {
  title: 'Scout test timeline',
  description: 'Scout timeline for attach test',
  query: 'host.name: *',
};

test.describe(
  'attach timeline to case',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.describe('without cases created', () => {
      test.beforeEach(async ({ browserAuth, kbnClient, apiServices }) => {
        await browserAuth.loginAsAdmin();
        await deleteTimelines(kbnClient);
        await deleteAllCases(apiServices.cases);
      });

      test('attach timeline to a new case', async ({ pageObjects, page, kbnClient }) => {
        const timelineResp = await createTimeline(kbnClient, mockTimeline);
        const timelineId = timelineResp.savedObjectId;

        await pageObjects.explore.gotoUrl(
          `/app/security/timelines?timeline=(id:'${timelineId}',isOpen:!t)`
        );
        await page.testSubj.locator('attach-timeline-case-button').first().click();
        await page.testSubj.locator('create-new-case').first().click();
        const descriptionInput = page.testSubj.locator('caseDescription').first();
        await expect(descriptionInput).toContainText(mockTimeline.title);
        await expect(descriptionInput).toContainText(timelineId);
      });

      test('attach timeline to an existing case with no case', async ({
        pageObjects,
        page,
        kbnClient,
      }) => {
        const timelineResp = await createTimeline(kbnClient, mockTimeline);
        const timelineId = timelineResp.savedObjectId;

        await pageObjects.explore.gotoUrl(
          `/app/security/timelines?timeline=(id:'${timelineId}',isOpen:!t)`
        );
        await page.testSubj.locator('attach-timeline-case-button').first().click();
        await page.testSubj.locator('all-cases-modal-create-case').first().click();
        const descriptionInput = page.testSubj.locator('caseDescription').first();
        await expect(descriptionInput).toContainText(mockTimeline.title);
        await expect(descriptionInput).toContainText(timelineId);
      });
    });

    test.describe('with cases created', () => {
      test.beforeEach(async ({ browserAuth, kbnClient, apiServices }) => {
        await browserAuth.loginAsAdmin();
        await deleteTimelines(kbnClient);
        await deleteAllCases(apiServices.cases);
      });

      test('attach timeline to an existing case', async ({
        pageObjects,
        page,
        kbnClient,
        apiServices,
      }) => {
        const timelineResp = await createTimeline(kbnClient, mockTimeline);
        const timelineId = timelineResp.savedObjectId;
        const caseResp = await apiServices.cases?.create?.({
          title: 'Existing case',
          description: 'Test case',
          tags: [],
          connector: { id: 'none', name: 'none', type: '.none', fields: null },
          settings: { syncAlerts: true, extractObservables: false },
          owner: 'securitySolution',
        });
        const caseId = caseResp?.data?.id;
        if (!caseId) {
          test.skip();
          return;
        }

        await pageObjects.explore.gotoUrl(
          `/app/security/timelines?timeline=(id:'${timelineId}',isOpen:!t)`
        );
        await page.testSubj.locator('attach-timeline-case-button').first().click();
        await page.testSubj.locator(`case-table-row-${caseId}`).first().click();
        const addCommentInput = page.testSubj.locator('caseCommentInput').first();
        await expect(addCommentInput).toContainText(mockTimeline.title);
        await expect(addCommentInput).toContainText(timelineId);
      });

      test('modal can be re-opened once closed', async ({
        pageObjects,
        page,
        kbnClient,
        apiServices,
      }) => {
        const timelineResp = await createTimeline(kbnClient, mockTimeline);
        const timelineId = timelineResp.savedObjectId;
        await apiServices.cases?.create?.({
          title: 'Existing case',
          description: 'Test case',
          tags: [],
          connector: { id: 'none', name: 'none', type: '.none', fields: null },
          settings: { syncAlerts: true, extractObservables: false },
          owner: 'securitySolution',
        });

        await pageObjects.explore.gotoUrl(
          `/app/security/timelines?timeline=(id:'${timelineId}',isOpen:!t)`
        );
        await page.testSubj.locator('attach-timeline-case-button').first().click();
        await page.testSubj.locator('all-cases-modal-cancel-button').first().click();
        await expect(page.testSubj.locator('all-cases-modal')).toHaveCount(0);
        await page.testSubj.locator('attach-timeline-case-button').first().click();
        await expect(page.testSubj.locator('all-cases-modal').first()).toBeVisible();
      });
    });
  }
);

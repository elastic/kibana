/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

const DEFAULT_QUERY = 'host.name: *';

spaceTest.describe(
  'Timelines',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ apiServices }) => {
      await apiServices.timeline.deleteAll();
    });

    spaceTest.afterAll(async ({ apiServices }) => {
      await apiServices.timeline.deleteAll();
    });

    spaceTest(
      'should create a timeline from a template and have the same query',
      async ({ browserAuth, pageObjects, apiServices }) => {
        const { timelinePage } = pageObjects;

        await apiServices.timeline.createTimelineTemplate({
          title: 'Security Timeline',
          description: 'This is the best timeline',
          query: DEFAULT_QUERY,
        });
        await browserAuth.loginAsPlatformEngineer();

        await spaceTest.step('Navigate to templates and select custom tab', async () => {
          await timelinePage.navigateToTemplates();
          await timelinePage.selectCustomTemplates();
        });

        await spaceTest.step('Create timeline from template', async () => {
          await timelinePage.createTimelineFromTemplate('Security Timeline');
        });

        await spaceTest.step('Verify flyout is visible with the template query', async () => {
          await expect(timelinePage.queryInput).toHaveText(DEFAULT_QUERY);
        });
      }
    );

    spaceTest(
      'should be able to create timeline with crud privileges',
      async ({ browserAuth, pageObjects }) => {
        const { timelinePage } = pageObjects;

        await browserAuth.loginAsPlatformEngineer();
        await timelinePage.navigateToTimelines();
        await timelinePage.open();
        await timelinePage.createNew();

        await timelinePage.addNameAndDescription('Security Timeline', 'This is the best timeline');

        await expect(timelinePage.panel).toBeVisible();
      }
    );

    spaceTest(
      'should not be able to create/update timeline with only read privileges',
      async ({ browserAuth, pageObjects }) => {
        const { timelinePage } = pageObjects;

        await browserAuth.loginAsT1Analyst();
        await timelinePage.navigateToTimelines();
        await timelinePage.open();
        await timelinePage.createNew();

        await expect(timelinePage.panel).toBeVisible();
        await expect(timelinePage.saveButton).toBeDisabled();

        await spaceTest.step('Hover save button and verify read-only tooltip', async () => {
          await timelinePage.hoverSaveButton();
          await expect(timelinePage.saveTooltip).toContainText(
            'you do not have the required permissions to save timelines'
          );
        });
      }
    );

    spaceTest('should show the different timeline states', async ({ browserAuth, pageObjects }) => {
      const { timelinePage } = pageObjects;

      await browserAuth.loginAsPlatformEngineer();
      await timelinePage.navigateToTimelines();
      await timelinePage.open();

      await spaceTest.step('Verify unsaved state on new timeline', async () => {
        await expect(timelinePage.saveStatus).toHaveText(/^Unsaved/);
      });

      await spaceTest.step('Save timeline', async () => {
        await timelinePage.saveWithName('Test');
        await expect(timelinePage.saveStatus).toBeHidden();
      });

      await spaceTest.step('Modify query and verify unsaved changes state', async () => {
        await timelinePage.executeKQL('agent.name : *');
        await expect(timelinePage.saveStatus).toBeVisible({ timeout: 30_000 });
        await expect(timelinePage.saveStatus).toHaveText(/^Unsaved changes/);
      });
    });

    spaceTest('should save timelines as new', async ({ browserAuth, pageObjects }) => {
      const { timelinePage } = pageObjects;

      await browserAuth.loginAsPlatformEngineer();
      await timelinePage.navigateToTimelines();

      await spaceTest.step('Verify no timelines exist initially', async () => {
        await expect(timelinePage.timelinesTable).toContainText(
          '0 timelines match the search criteria'
        );
      });

      await spaceTest.step('Create and save first timeline', async () => {
        await timelinePage.open();
        await timelinePage.saveWithName('First');
        await expect(timelinePage.saveStatus).toBeHidden();
      });

      await spaceTest.step('Save as new timeline with different name', async () => {
        await timelinePage.saveAsNew('Second');
      });

      await spaceTest.step('Close and verify both timelines appear in list', async () => {
        await timelinePage.close();
        await expect(timelinePage.timelineRows).toHaveCount(2);
        await expect(timelinePage.timelineRows).toContainText(['Second', 'First']);
      });
    });
  }
);

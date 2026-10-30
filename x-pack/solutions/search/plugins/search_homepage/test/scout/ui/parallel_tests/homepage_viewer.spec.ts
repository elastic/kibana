/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-search';
import { expect } from '@kbn/scout-search/ui';
import { test } from '../fixtures';

test.describe(
  'Homepage - Viewer',
  { tag: [...tags.serverless.search, ...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await page.addInitScript(() => {
        window.localStorage.setItem('gettingStartedVisited', 'true');
      });
      await pageObjects.homepage.goto();
    });

    test('greets the viewer by name', async ({ pageObjects, samlAuth }) => {
      const userData = await samlAuth.session.getUserData('viewer');

      await expect(pageObjects.homepage.header).toContainText(`Welcome, ${userData?.full_name}`);
    });

    test('shows the dashboards card the viewer can read', async ({ pageObjects }) => {
      await expect(pageObjects.homepage.dashboardsCard).toBeVisible();
    });

    test('has an embedded dev console that can be toggled', async ({ pageObjects }) => {
      const { embeddedConsole } = pageObjects;
      await expect(embeddedConsole.section).toBeVisible();
      await expect(embeddedConsole.body).toBeHidden();

      await embeddedConsole.toggle();
      await expect(embeddedConsole.body).toBeVisible();

      await embeddedConsole.toggle();
      await expect(embeddedConsole.body).toBeHidden();
    });
  }
);

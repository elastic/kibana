/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { ONBOARDING_SEEN_STORAGE_KEY } from '../fixtures/constants';

test.describe('Vector DB tutorials page', { tag: [...tags.serverless.vectordb] }, () => {
  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, 'true');
    }, ONBOARDING_SEEN_STORAGE_KEY);
    await pageObjects.vectordbTutorials.goto();
  });

  test('renders tutorial cards and onboarding path panels', async ({ pageObjects }) => {
    const tutorials = pageObjects.vectordbTutorials;

    await expect(tutorials.topicFilter).toBeVisible();
    await expect(tutorials.tutorialCard('vector-search-documentation')).toBeVisible();
    await expect(tutorials.generatePathCard).toBeVisible();
    await expect(tutorials.storePathCard).toBeVisible();
  });

  test('topic filter narrows the visible cards', async ({ pageObjects }) => {
    const tutorials = pageObjects.vectordbTutorials;

    await expect(tutorials.tutorialCard('vector-search-documentation')).toBeVisible();
    const allCount = await tutorials.tutorialCards.count();
    expect(allCount).toBeGreaterThan(0);

    await test.step('filter to Articles only', async () => {
      await tutorials.topicFilterButton('Articles').click();
      await expect(tutorials.tutorialCard('preconditioning-vectors-bbq-article')).toBeVisible();
      await expect(tutorials.tutorialCard('vector-search-documentation')).toBeHidden();
      await expect.poll(() => tutorials.tutorialCards.count()).toBeLessThan(allCount);
    });

    await test.step('reset back to All', async () => {
      await tutorials.topicFilterButton('All').click();
      await expect.poll(() => tutorials.tutorialCards.count()).toBe(allCount);
    });
  });
});

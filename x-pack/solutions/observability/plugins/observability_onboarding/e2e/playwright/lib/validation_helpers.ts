/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page } from '@playwright/test';
import { DiscoverValidationPage } from '../stateful/pom/pages/discover_validation.page';
import { StreamsValidationPage } from '../stateful/pom/pages/streams_validation.page';

export async function assertDiscoverHasData(
  page: Page,
  { assertHitCount = false } = {}
): Promise<void> {
  const discoverValidation = new DiscoverValidationPage(page);
  await discoverValidation.waitForDiscoverToLoad();
  await discoverValidation.assertHasAnyLogData();
  if (assertHitCount) {
    await discoverValidation.assertHitCountGreaterThanZero();
  }
}

export async function assertStreamHasData(
  page: Page,
  streamName: string,
  { timeout = 4 * 60000 }: { timeout?: number } = {}
): Promise<void> {
  // logs.ecs materializes lazily on first ingest, so poll until data lands rather than assume a
  // fixed delay. Separate page keeps the caller's onboarding page intact for later checks.
  const streamsPage = await page.context().newPage();
  try {
    await expect(async () => {
      await streamsPage.goto(`${process.env.KIBANA_BASE_URL}/app/streams`);
      const streamsValidation = new StreamsValidationPage(streamsPage);
      await streamsValidation.waitForStreamsToLoad();
      await streamsValidation.assertStreamDocCountGreaterThanZero(streamName);
    }).toPass({ timeout });
  } finally {
    await streamsPage.close();
  }
}

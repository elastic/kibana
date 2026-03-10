/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtendedApiServicesFixture, ExtendedScoutTestFixtures } from '..';

interface WiredStreamsSetupFixtures {
  apiServices: ExtendedApiServicesFixture;
}

interface WiredStreamsBeforeEachFixtures {
  pageObjects: ExtendedScoutTestFixtures['pageObjects'];
  browserAuth: { loginAsAdmin: () => Promise<void> };
}

export async function setupWiredStreamsOnce({ apiServices }: WiredStreamsSetupFixtures) {
  try {
    await apiServices.onboarding.enableWiredStreams();
  } catch {
    // Wired streams might already be enabled, continue with tests
  }
}

export async function setupWiredStreamsBeforeEach({
  pageObjects,
  browserAuth,
}: WiredStreamsBeforeEachFixtures) {
  await browserAuth.loginAsAdmin();
  await pageObjects.onboarding.goto();
  await pageObjects.onboarding.waitForMainTilesToLoad();
}

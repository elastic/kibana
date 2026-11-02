/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Page } from '@playwright/test';
import { DiscoverValidationPage } from '../stateful/pom/pages/discover_validation.page';

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

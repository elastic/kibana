/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { ONBOARDING_SEEN_STORAGE_KEY } from './constants';

/**
 * Seeds `localStorage` before the app boots. The plugin reads these flags during its first
 * render, so they have to be in place before navigation rather than set afterwards.
 */
export const seedLocalStorage = async (page: ScoutPage, entries: Record<string, string>) => {
  await page.addInitScript((items: Record<string, string>) => {
    for (const [key, value] of Object.entries(items)) {
      window.localStorage.setItem(key, value);
    }
  }, entries);
};

/**
 * Marks onboarding as already seen so the app root renders the home page instead of bouncing
 * the user into the setup guide.
 */
export const seedReturningUser = (page: ScoutPage) =>
  seedLocalStorage(page, { [ONBOARDING_SEEN_STORAGE_KEY]: 'true' });

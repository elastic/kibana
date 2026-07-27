/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ONBOARDING_EXITED_STORAGE_KEY, ONBOARDING_SEEN_STORAGE_KEY } from './storage_keys';

/**
 * Persistent flag used to decide whether to auto-route a fresh user into the
 * onboarding wizard. Set the moment the user enters the wizard (not just on
 * "done") so that reloading mid-wizard or returning to the home page does
 * not loop them back into the wizard.
 */
export const hasSeenOnboarding = (): boolean => {
  try {
    return localStorage.getItem(ONBOARDING_SEEN_STORAGE_KEY) === 'true';
  } catch {
    // localStorage unavailable (e.g. private browsing) — treat as already seen
    // so the wizard never permanently blocks the dashboard.
    return true;
  }
};

export const markOnboardingSeen = (): void => {
  try {
    localStorage.setItem(ONBOARDING_SEEN_STORAGE_KEY, 'true');
  } catch {
    // Best-effort: if storage is unavailable, the redirect simply re-fires.
  }
};

/**
 * Persistent flag set once the user navigates away from the onboarding wizard
 * (the landing page or any of its steps). Unlike `hasSeenOnboarding`, which is
 * set the moment the wizard is entered, this stays unset while the user moves
 * between wizard pages, so first-visit affordances (e.g. the skip link) remain
 * visible until they actually leave.
 */
export const hasExitedOnboarding = (): boolean => {
  try {
    return localStorage.getItem(ONBOARDING_EXITED_STORAGE_KEY) === 'true';
  } catch {
    // localStorage unavailable — treat as exited so first-visit affordances
    // are simply hidden rather than shown forever.
    return true;
  }
};

export const markOnboardingExited = (): void => {
  try {
    localStorage.setItem(ONBOARDING_EXITED_STORAGE_KEY, 'true');
  } catch {
    // Best-effort, same as markOnboardingSeen.
  }
};

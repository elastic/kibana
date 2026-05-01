/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Persistent flag used to decide whether to auto-route a fresh user into the
 * onboarding wizard. Set the moment the user enters the wizard (not just on
 * "done") so that reloading mid-wizard or returning to the home page does
 * not loop them back into the wizard.
 */
const STORAGE_KEY = 'serverless.onboarding.completed';

export const hasSeenOnboarding = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    // localStorage unavailable (e.g. private browsing) — treat as already seen
    // so the wizard never permanently blocks the dashboard.
    return true;
  }
};

export const markOnboardingSeen = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // Best-effort: if storage is unavailable, the redirect simply re-fires.
  }
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Marks the CPS project picker tour as shown, so it does not open during the test. The chrome
 * header renders the picker on every page, and the tour stores its state in this local storage key.
 * Call it before the first navigation of the page.
 */
export const dismissProjectPickerTour = async (page: ScoutPage): Promise<void> => {
  await page.addInitScript(() => {
    window.localStorage.setItem('cps:projectPicker:tourShown', 'true');
  });
};

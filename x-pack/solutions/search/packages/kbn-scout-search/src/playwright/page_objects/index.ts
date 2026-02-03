/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchPageObjects extends PageObjects {
  // Add Search-specific page objects here
}

export function extendPageObjects(pageObjects: PageObjects, _page: ScoutPage): SearchPageObjects {
  return {
    ...pageObjects,
    // Add Search-specific page objects here
  };
}

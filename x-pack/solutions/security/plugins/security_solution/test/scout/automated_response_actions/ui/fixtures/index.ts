/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ScoutPage,
  SecurityPageObjects,
  SecurityTestFixtures,
  SecurityWorkerFixtures,
} from '@kbn/scout-security';
import { createLazyPageObject, test as baseTest, tags } from '@kbn/scout-security';
import { DocumentResponseFlyout } from './page_objects';

export interface AutomatedResponseActionsFixtures extends SecurityTestFixtures {
  pageObjects: SecurityPageObjects & {
    documentResponseFlyout: DocumentResponseFlyout;
  };
}

export const test = baseTest.extend<AutomatedResponseActionsFixtures, SecurityWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: SecurityPageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: AutomatedResponseActionsFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      documentResponseFlyout: createLazyPageObject(DocumentResponseFlyout, page),
    });
  },
});

export { tags };

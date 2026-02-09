/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as baseTest } from '@kbn/scout-security';
import type { AiAssistantPageObjects } from '../page_objects';
import { extendPageObjects } from '../page_objects';

interface AiAssistantTestFixtures {
  pageObjects: AiAssistantPageObjects;
}

export const test = baseTest.extend<AiAssistantTestFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    const extended = extendPageObjects(pageObjects, page);
    await use(extended);
  },
});

export { expect } from '@kbn/scout-security';

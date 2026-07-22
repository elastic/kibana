/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest as baseSpaceTest, createLazyPageObject } from '@kbn/scout-security';
import type { SecurityTestFixtures, SecurityPageObjects, ScoutPage } from '@kbn/scout-security';
import { EntityCasesPage } from './page_objects/entity_cases_page';

interface SecuritySolutionTestFixtures extends SecurityTestFixtures {
  pageObjects: SecurityPageObjects & { entityCases: EntityCasesPage };
}

export const spaceTest = baseSpaceTest.extend<SecuritySolutionTestFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: SecuritySolutionTestFixtures['pageObjects'];
      page: ScoutPage;
    },
    use: (pageObjects: SecuritySolutionTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      entityCases: createLazyPageObject(EntityCasesPage, page),
    });
  },
});

export { tags } from '@kbn/scout-security';

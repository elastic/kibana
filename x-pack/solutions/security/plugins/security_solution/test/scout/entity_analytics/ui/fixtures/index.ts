/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  spaceTest as baseSpaceTest,
  test as baseTest,
  createLazyPageObject,
} from '@kbn/scout-security';
import type {
  SecurityTestFixtures,
  SecurityPageObjects,
  SecurityApiServicesFixture,
  ScoutPage,
} from '@kbn/scout-security';
import { EntityCasesPage } from './page_objects/entity_cases_page';
import { EntityAnalyticsHomePage } from './page_objects/entity_analytics_home_page';
import { createEntityCasesApi } from './entity_cases_api';
import type { EntityCasesApiFixture } from './entity_cases_api';

interface SecuritySolutionTestFixtures extends SecurityTestFixtures {
  pageObjects: SecurityPageObjects & { entityCases: EntityCasesPage };
  entityCasesApi: EntityCasesApiFixture;
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
  entityCasesApi: async (
    {
      apiServices,
      scoutSpace,
    }: {
      apiServices: SecurityApiServicesFixture;
      scoutSpace: { id: string };
    },
    use: (entityCasesApi: EntityCasesApiFixture) => Promise<void>
  ) => {
    await use(createEntityCasesApi(apiServices.cases, scoutSpace.id));
  },
});

interface EntityAnalyticsHomeTestFixtures extends SecurityTestFixtures {
  pageObjects: SecurityPageObjects & { entityAnalyticsHome: EntityAnalyticsHomePage };
}

/** Sequential suites (`tests/`): the new home page is behind a server-wide feature flag. */
export const test = baseTest.extend<EntityAnalyticsHomeTestFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: EntityAnalyticsHomeTestFixtures['pageObjects'];
      page: ScoutPage;
    },
    use: (pageObjects: EntityAnalyticsHomeTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      entityAnalyticsHome: createLazyPageObject(EntityAnalyticsHomePage, page),
    });
  },
});

export { tags } from '@kbn/scout-security';

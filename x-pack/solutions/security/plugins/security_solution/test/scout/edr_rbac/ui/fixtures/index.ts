/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest as baseSpaceTest } from '@kbn/scout-security';
import type {
  ScoutPage,
  ScoutTestConfig,
  SecurityPageObjects,
  SecurityParallelTestFixtures,
} from '@kbn/scout-security';
import { extendPageObjects } from './page_objects';
import type { EdrRbacPageObjects } from './page_objects';

export interface EdrRbacTestFixtures extends SecurityParallelTestFixtures {
  pageObjects: EdrRbacPageObjects;
}

export const spaceTest = baseSpaceTest.extend<EdrRbacTestFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
      config,
    }: { pageObjects: SecurityPageObjects; page: ScoutPage; config: ScoutTestConfig },
    use: (pageObjects: EdrRbacPageObjects) => Promise<void>
  ) => {
    await use(extendPageObjects(pageObjects, page, config));
  },
});

export {
  ENDPOINT_MANAGEMENT_AREAS,
  ENDPOINT_MANAGEMENT_LINK_IDS,
} from './endpoint_management_areas';
export { getSingleAreaRole, getBasePrivilegeOnlyRole, getSpaceScopedEndpointRole } from './roles';

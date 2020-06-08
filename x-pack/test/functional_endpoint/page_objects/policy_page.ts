/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function EndpointPolicyPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);

  return {
    /**
     * Navigates to the Endpoint Policy List
     */
    async navigateToPolicyList() {
      await pageObjects.common.navigateToApp('securitySolution', { hash: '/management/policy' });
    },
  };
}

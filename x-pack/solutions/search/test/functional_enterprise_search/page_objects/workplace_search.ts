/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function WorkplaceSearchPageProvider({ getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);

  return {
    async navigateToPage(): Promise<void> {
      return await PageObjects.common.navigateToApp('enterprise_search/workplace_search');
    },
  };
}

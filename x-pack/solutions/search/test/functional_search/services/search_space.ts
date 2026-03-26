/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export function SearchSpaceServiceProvider({ getPageObjects, getService }: FtrProviderContext) {
  const { common } = getPageObjects(['common']);
  const browser = getService('browser');
  const spaces = getService('spaces');

  return {
    createTestSpace: async (spaceName: string, solution: 'es' | 'classic' = 'es') => {
      // Navigate to the spaces management page which will log us in Kibana
      await common.navigateToUrl('management', 'kibana/spaces', {
        shouldUseHashForSubUrl: false,
      });
      // Create a space with the search solution and navigate to its home page
      const { cleanUp, space: spaceCreated } = await spaces.create({
        name: spaceName,
        solution,
      });
      const rootUrl = spaces.getRootUrl(spaceCreated.id);

      return {
        cleanUp,
        rootUrl,
        spaceCreated,
      };
    },
    navigateTo: async (spaceId: string) => {
      await browser.navigateTo(spaces.getRootUrl(spaceId));
    },
  };
}

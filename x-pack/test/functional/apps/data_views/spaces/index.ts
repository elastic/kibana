/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'spaceSelector',
    'home',
    'header',
    'security',
    'settings',
  ]);
  const spacesService = getService('spaces');
  describe('spaces', function () {
    this.tags('skipFirefox');

    it('does a thing', async () => {
      await spacesService.create({
        id: 'custom_space',
        name: 'custom_space',
        disabledFeatures: [],
      });

      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
    });
  });
}

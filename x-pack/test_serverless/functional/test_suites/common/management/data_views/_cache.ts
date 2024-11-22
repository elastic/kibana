/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['settings', 'common', 'header']);
  const testSubjects = getService('testSubjects');

  describe('Data view field caps cache advanced setting', function () {
    before(async () => {
      await PageObjects.settings.navigateTo();
    });

    it('should not have cache setting', async () => {
      await testSubjects.missingOrFail(
        'management-settings-editField-data_views\\:cache_max_age-group'
      );
    });
  });
}

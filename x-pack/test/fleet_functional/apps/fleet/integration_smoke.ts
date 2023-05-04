/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');

  describe('Elastic synthetics integration', function () {
    this.tags(['smoke']);
    before(async () => {
      await PageObjects.common.navigateToUrl('management', 'integrations/installed', {
        ensureCurrentUrl: false,
        shouldLoginIfPrompted: false,
        shouldUseHashForSubUrl: false,
      });
    });

    // This is a basic smoke test to cover Fleet package installed logic
    // https://github.com/elastic/kibana/pull/144899
    it('should show the Elastic synthetics integration', async () => {
      await testSubjects.exists('integration-card:epr:synthetics');
    });
  });
}

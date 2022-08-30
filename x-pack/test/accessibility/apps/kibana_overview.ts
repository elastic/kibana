/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'home']);
  const a11y = getService('a11y');
  const kibanaServer = getService('kibanaServer');

  describe('Kibana overview Accessibility', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await PageObjects.common.navigateToApp('kibanaOverview');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('Kibana overview', async () => {
      await a11y.testAppSnapshot();
    });
  });
}

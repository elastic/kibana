/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['uptime']);
  const retry = getService('retry');

  describe('uptime settings page', function() {
    it('loads settings', async () => {
      await pageObjects.uptime.goToUptimeSettingsAndLoadData();
    });
  });
};

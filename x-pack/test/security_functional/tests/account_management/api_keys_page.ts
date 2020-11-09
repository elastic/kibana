/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const log = getService('log');
  const find = getService('find');
  const security = getService('security');

  describe('API keys page', function () {
    before(async () => {
      await security.role.create('allow_manage_own_api_key_role', {
        elasticsearch: {
          cluster: ['manage_own_api_key'],
        },
      });
      await security.testUser.setRoles(['allow_manage_own_api_key_role']);
      await pageObjects.common.navigateToApp('accountManagementApiKeys');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('creates API key', async () => {
      log.debug('Checking for section header');

      await find.clickByLinkText('Create API key');

      const nameInput = await find.byName('name');
      await nameInput.type('test');

      await find.clickByButtonText('Create API key');

      await find.byCssSelector('.euiCallOut--success');
    });
  });
}

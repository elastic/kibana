/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  describe('Cloud Chat integration', function () {
    before(async () => {
      // Create role mapping so user gets superuser access
      await getService('esSupertest')
        .post('/_security/role_mapping/saml1')
        .send({ roles: ['superuser'], enabled: true, rules: { field: { 'realm.name': 'saml1' } } })
        .expect(200);
    });

    it('chat widget is present on integrations page', async () => {
      await PageObjects.common.navigateToUrl('integrations', 'browse', {
        useActualUrl: true,
        shouldUseHashForSubUrl: false,
      });
      await testSubjects.existOrFail('cloud-chat');
    });

    it('chat widget is present on home getting_started page', async () => {
      await PageObjects.common.navigateToUrl('home', '/getting_started', {
        useActualUrl: true,
        shouldUseHashForSubUrl: true,
      });
      await testSubjects.existOrFail('cloud-chat');
    });

    it('chat widget is present on observability/overview page', async () => {
      await PageObjects.common.navigateToUrl('observability', '/overview', {
        useActualUrl: true,
        shouldUseHashForSubUrl: true,
      });
      await testSubjects.existOrFail('cloud-chat');
    });

    it('chat widget is present on security/get_started page', async () => {
      await PageObjects.common.navigateToUrl('security', '/get_started', {
        useActualUrl: true,
        shouldUseHashForSubUrl: true,
      });
      await testSubjects.existOrFail('cloud-chat');
    });
  });
}

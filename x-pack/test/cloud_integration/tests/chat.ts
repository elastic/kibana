/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const PageObjects = getPageObjects(['common']);

  describe('Cloud Chat integration', function () {
    before(async () => {
      // Create role mapping so user gets superuser access
      await getService('esSupertest')
        .post('/_security/role_mapping/saml1')
        .send({ roles: ['superuser'], enabled: true, rules: { field: { 'realm.name': 'saml1' } } })
        .expect(200);
    });

    it('chat widget is present when enabled', async () => {
      PageObjects.common.navigateToUrl('integrations', 'browse', { useActualUrl: true });
      const chat = await find.byCssSelector('[data-test-subj="floatingChatTrigger"]', 20000);
      expect(chat).to.not.be(null);
    });
  });
}

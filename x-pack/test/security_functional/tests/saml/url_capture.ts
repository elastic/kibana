/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { parse } from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const find = getService('find');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common']);

  describe('URL capture', function () {
    this.tags('includeFirefox');

    before(async () => {
      await getService('esSupertest')
        .post('/_security/role_mapping/saml1')
        .send({ roles: ['superuser'], enabled: true, rules: { field: { 'realm.name': 'saml1' } } })
        .expect(200);

      await esArchiver.load('../../functional/es_archives/empty_kibana');
    });

    after(async () => {
      await esArchiver.unload('../../functional/es_archives/empty_kibana');
    });

    afterEach(async () => {
      await browser.get(PageObjects.common.getHostPort() + '/logout');
      await PageObjects.common.waitUntilUrlIncludes('logged_out');
    });

    it('can login preserving original URL', async () => {
      await browser.get(
        PageObjects.common.getHostPort() + '/app/management/security/users#some=hash-value'
      );

      await find.byCssSelector(
        '[data-test-subj="kibanaChrome"] .app-wrapper:not(.hidden-chrome)',
        20000
      );

      // We need to make sure that both path and hash are respected.
      const currentURL = parse(await browser.getCurrentUrl());
      expect(currentURL.pathname).to.eql('/app/management/security/users');
      expect(currentURL.hash).to.eql('#some=hash-value');
    });
  });
}

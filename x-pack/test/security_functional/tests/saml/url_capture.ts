/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse } from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const find = getService('find');
  const browser = getService('browser');
  const deployment = getService('deployment');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  describe('URL capture', function () {
    this.tags('includeFirefox');

    before(async () => {
      await getService('esSupertest')
        .post('/_security/role_mapping/saml1')
        .send({ roles: ['superuser'], enabled: true, rules: { field: { 'realm.name': 'saml1' } } })
        .expect(200);

      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
    });

    afterEach(async () => {
      await browser.get(deployment.getHostPort() + '/logout');
      await PageObjects.common.waitUntilUrlIncludes('logged_out');
    });

    it('can login preserving original URL', async () => {
      await browser.get(
        deployment.getHostPort() + '/app/management/security/users#some=hash-value'
      );

      await find.byCssSelector(
        '[data-test-subj="kibanaChrome"] .kbnAppWrapper:not(.kbnAppWrapper--hiddenChrome)',
        20000
      );

      // We need to make sure that both path and hash are respected.
      const currentURL = parse(await browser.getCurrentUrl());
      expect(currentURL.pathname).to.eql('/app/management/security/users');
      expect(currentURL.hash).to.eql('#some=hash-value');
    });

    it('can login after `Unauthorized` error preserving original URL', async () => {
      await getService('supertest')
        .post('/authentication/app/setup')
        .send({ simulateUnauthorized: true })
        .expect(200);
      await browser.get(`${deployment.getHostPort()}/authentication/app?one=two`);

      await find.byCssSelector('[data-test-subj="promptPage"]', 20000);
      await getService('supertest')
        .post('/authentication/app/setup')
        .send({ simulateUnauthorized: false })
        .expect(200);

      await testSubjects.click('logInButton');
      await find.byCssSelector('[data-test-subj="testEndpointsAuthenticationApp"]', 20000);

      const currentURL = parse(await browser.getCurrentUrl());
      expect(currentURL.path).to.eql('/authentication/app?one=two');
    });
  });
}

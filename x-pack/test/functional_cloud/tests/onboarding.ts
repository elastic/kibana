/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'url';

import expect from '@kbn/expect';

import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { FtrProviderContext } from '../../security_functional/ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const es = getService('es');
  const find = getService('find');
  const browser = getService('browser');
  const deployment = getService('deployment');
  const PageObjects = getPageObjects(['common']);
  const supertest = getService('supertest');

  const deleteSavedObject = async () => {
    await es.deleteByQuery({
      index: MAIN_SAVED_OBJECT_INDEX,
      q: 'type:cloud',
      wait_for_completion: true,
      refresh: true,
      body: {},
      conflicts: 'proceed',
    });
  };

  describe('Onboarding integration', function () {
    this.tags('includeFirefox');

    before(async () => {
      await getService('esSupertest')
        .post('/_security/role_mapping/saml1')
        .send({ roles: ['superuser'], enabled: true, rules: { field: { 'realm.name': 'saml1' } } })
        .expect(200);
    });

    afterEach(async () => {
      await browser.get(deployment.getHostPort() + '/logout');
      await PageObjects.common.waitUntilUrlIncludes('logged_out');

      await deleteSavedObject();
    });

    it('Redirect and save token', async () => {
      await browser.get(
        deployment.getHostPort() +
          `/app/cloud/onboarding?onboarding_token=vector&next=${encodeURIComponent(
            '/app/elasticsearch/vector_search'
          )}#some=hash-value`
      );
      await find.byCssSelector('[data-test-subj="userMenuButton"]', 20000);

      // We need to make sure that both path and hash are respected.
      const currentURL = parse(await browser.getCurrentUrl());
      expect(currentURL.pathname).to.eql('/app/elasticsearch/vector_search');
      expect(currentURL.hash).to.eql('#some=hash-value');

      const {
        body: { onboardingData },
      } = await supertest
        .get('/internal/cloud/solution')
        .set('kbn-xsrf', 'xxx')
        .set('x-elastic-internal-origin', 'cloud')
        .set('elastic-api-version', '1')
        .expect(200);
      expect(onboardingData).to.eql({ token: 'vector' });
    });

    it('Redirect and save security details at creation time', async () => {
      const securityDetails = '{"use_case":"siem","migration":{"value":true,"type":"splunk"}}';

      await browser.get(
        deployment.getHostPort() +
          `/app/cloud/onboarding?onboarding_token=security&security=${securityDetails}&next=${encodeURIComponent(
            '/app/security/get_started'
          )}#some=hash-value`
      );
      await find.byCssSelector('[data-test-subj="userMenuButton"]', 20000);

      // We need to make sure that both path and hash are respected.
      const currentURL = parse(await browser.getCurrentUrl());
      expect(currentURL.pathname).to.eql('/app/security/get_started');
      expect(currentURL.hash).to.eql('#some=hash-value');

      const {
        body: { onboardingData },
      } = await supertest
        .get('/internal/cloud/solution')
        .set('kbn-xsrf', 'xxx')
        .set('x-elastic-internal-origin', 'cloud')
        .set('elastic-api-version', '1')
        .expect(200);
      expect(onboardingData).to.eql({
        token: 'security',
        security: {
          useCase: 'siem',
          migration: {
            value: true,
            type: 'splunk',
          },
        },
      });
    });

    it('Redirect and update security details', async () => {
      const securityDetails = '{"use_case":"siem","migration":{"value":true,"type":"splunk"}}';

      await browser.get(
        deployment.getHostPort() +
          `/app/cloud/onboarding?onboarding_token=security&security=${securityDetails}&next=${encodeURIComponent(
            '/app/security/get_started'
          )}#some=hash-value`
      );
      await find.byCssSelector('[data-test-subj="userMenuButton"]', 20000);

      // We need to make sure that both path and hash are respected.
      const currentURL = parse(await browser.getCurrentUrl());
      expect(currentURL.pathname).to.eql('/app/security/get_started');
      expect(currentURL.hash).to.eql('#some=hash-value');

      const {
        body: { onboardingData },
      } = await supertest
        .get('/internal/cloud/solution')
        .set('kbn-xsrf', 'xxx')
        .set('x-elastic-internal-origin', 'cloud')
        .set('elastic-api-version', '1')
        .expect(200);

      expect(onboardingData).to.eql({
        token: 'security',
        security: {
          useCase: 'siem',
          migration: {
            value: true,
            type: 'splunk',
          },
        },
      });

      const securityDetailsUpdated =
        '{"use_case":"cloud","migration":{"value":true,"type":"other"}}';

      await browser.get(
        deployment.getHostPort() +
          `/app/cloud/onboarding?onboarding_token=security&security=${securityDetailsUpdated}&next=${encodeURIComponent(
            '/app/security/get_started'
          )}#some=hash-value`
      );

      await find.byCssSelector('[data-test-subj="userMenuButton"]', 20000);

      const {
        body: { onboardingData: onboardingDataUpdated },
      } = await supertest
        .get('/internal/cloud/solution')
        .set('kbn-xsrf', 'xxx')
        .set('x-elastic-internal-origin', 'cloud')
        .set('elastic-api-version', '1')
        .expect(200);

      expect(onboardingDataUpdated).to.eql({
        token: 'security',
        security: {
          useCase: 'cloud',
          migration: {
            value: true,
            type: 'other',
          },
        },
      });
    });

    it(`Redirect and keep initial onboarding token when it's not provided on update`, async () => {
      const securityDetails = '{"use_case":"siem","migration":{"value":true,"type":"splunk"}}';

      await browser.get(
        deployment.getHostPort() +
          `/app/cloud/onboarding?onboarding_token=security&security=${securityDetails}&next=${encodeURIComponent(
            '/app/security/get_started'
          )}#some=hash-value`
      );
      await find.byCssSelector('[data-test-subj="userMenuButton"]', 20000);

      // We need to make sure that both path and hash are respected.
      const currentURL = parse(await browser.getCurrentUrl());
      expect(currentURL.pathname).to.eql('/app/security/get_started');
      expect(currentURL.hash).to.eql('#some=hash-value');

      const {
        body: { onboardingData },
      } = await supertest
        .get('/internal/cloud/solution')
        .set('kbn-xsrf', 'xxx')
        .set('x-elastic-internal-origin', 'cloud')
        .set('elastic-api-version', '1')
        .expect(200);

      expect(onboardingData).to.eql({
        token: 'security',
        security: {
          useCase: 'siem',
          migration: {
            value: true,
            type: 'splunk',
          },
        },
      });

      await browser.get(
        deployment.getHostPort() +
          `/app/cloud/onboarding?security=${securityDetails}&next=${encodeURIComponent(
            '/app/security/get_started'
          )}#some=hash-value`
      );

      await find.byCssSelector('[data-test-subj="userMenuButton"]', 20000);

      const {
        body: { onboardingData: onboardingDataUpdated },
      } = await supertest
        .get('/internal/cloud/solution')
        .set('kbn-xsrf', 'xxx')
        .set('x-elastic-internal-origin', 'cloud')
        .set('elastic-api-version', '1')
        .expect(200);

      expect(onboardingDataUpdated).to.eql({
        token: 'security',
        security: {
          useCase: 'siem',
          migration: {
            value: true,
            type: 'splunk',
          },
        },
      });
    });
  });
}

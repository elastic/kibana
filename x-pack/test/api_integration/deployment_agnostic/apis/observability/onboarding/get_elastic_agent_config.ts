/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { load } from 'js-yaml';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { SupertestWithRoleScopeType } from '../../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let adminClient: SupertestWithRoleScopeType;

  describe('Generate Elastic Agent configuration', () => {
    before(async () => {
      adminClient = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });
    });

    it(`should return input properties empty when onboardingId doesn't exists`, async () => {
      const response = await adminClient
        .get('/internal/observability_onboarding/elastic_agent/config')
        .query({ onboardingId: 'my-onboarding-id' });

      expect(response.status).to.be(200);

      const ymlConfig = load(response.text);
      expect(ymlConfig.inputs[0].data_stream.namespace).to.be('');
      expect(ymlConfig.inputs[0].streams[0].data_stream.dataset).to.be('');
      expect(ymlConfig.inputs[0].streams[0].paths).to.be.empty();
    });
  });
}

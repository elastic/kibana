/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  appName,
  ilmName,
  catVersion,
} from '../../../../plugins/endpoint/server/services/bootstrap';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'endpoint']);
  const es = getService('es');

  describe('Endpoint Home page', function() {
    this.tags(['skipCloud']);
    before(async () => {
      await pageObjects.common.navigateToApp('endpoint');
    });

    it('Loads the app', async () => {
      // this function call comes from what you defined in the endpoint_page.ts
      const welcomeEndpointMessage = await pageObjects.endpoint.welcomeEndpointMessage();
      expect(welcomeEndpointMessage).to.be('Welcome to Endpoint!');
    });

    it('Has an endpoint index created', async () => {
      const indices = await es.cat.indices({
        format: 'json',
        index: appName + '-*',
      });
      expect(indices).to.not.be.empty();
    });

    it('Has an ILM policy created', async () => {
      const policyName = catVersion(ilmName);
      const policies = await es.transport.request({
        path: `/_ilm/policy/${policyName}`,
      });
      expect(policies).to.be.ok();
      expect(policies[policyName]).to.be.ok();
    });

    it('Has an endpoint template defined', async () => {
      const templateName = catVersion(appName);
      const hasTemplate = await es.indices.existsTemplate({
        name: templateName,
      });
      expect(hasTemplate).to.be.ok();
    });
  });
};

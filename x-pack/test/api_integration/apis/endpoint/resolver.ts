/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { buildPhase0EntityID } from '../../../../plugins/endpoint/server/services/resolver/common';

const commonHeaders = {
  Accept: 'application/json',
  'kbn-xsrf': 'some-xsrf-token',
};

// eslint-disable-next-line import/no-default-export
export default function resolverAPIIntegrationTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  /**
   * Tree was generated using the following resolver-generator configuration
   * tree:
   *    agent.id: '99b3e56e-0596-4b02-bbd1-0b581ec983a4'
   *    schema_version: 'v0'
   *    generate:
   *      depth: 5
   *      width: 3
   */
  describe('Resolver api', function() {
    const rootEntityID = buildPhase0EntityID('99b3e56e-0596-4b02-bbd1-0b581ec983a4', 1);
    before(() => esArchiver.load('endpoint/resolver/api_feature'));
    after(() => esArchiver.unload('endpoint/resolver/api_feature'));
    it('should return details for the root node', async () => {
      const { body } = await supertest
        // entity_id 1 should be the root node
        .get(`/api/endpoint/resolver/node?entity_id=${rootEntityID}`)
        .set(commonHeaders)
        .expect(200);

      expect(body.node.parent_entity_id).to.eql(0);
      expect(body.node.entity_id).to.eql(1);
      expect(body.node.events.length).to.eql(1);

      expect(body.node.total).to.eql(1);
    });
    it('should return the right number of total events', async () => {
      // should be 21
    });
  });
}

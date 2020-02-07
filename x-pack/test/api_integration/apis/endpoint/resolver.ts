/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { buildLegacyEntityID } from '../../../../plugins/endpoint/server/services/resolver/common';

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
    const endpointID = '99b3e56e-0596-4b02-bbd1-0b581ec983a4';
    const rootEntityID = buildLegacyEntityID(endpointID, 1);
    const rootParentEntityID = buildLegacyEntityID(endpointID, 0);
    before(() => esArchiver.load('endpoint/resolver/api_feature'));
    after(() => esArchiver.unload('endpoint/resolver/api_feature'));
    it('should return details for the root node', async () => {
      const { body } = await supertest
        // entity_id 1 should be the root node
        .get(`/api/endpoint/resolver/node?entity_id=${rootEntityID}`)
        .set(commonHeaders)
        .expect(200);

      expect(body.node.parent_entity_id).to.eql(rootParentEntityID);
      expect(body.node.entity_id).to.eql(rootEntityID);
      expect(body.node.events.length).to.eql(1);

      expect(body.total).to.eql(1);
      // default page size
      expect(body.request_page_size).to.eql(10);
      expect(body.request_page_index).to.eql(0);
      expect(body.result_from_index).to.eql(0);
    });
    it('should return the right number of children nodes', async () => {
      const { body } = await supertest
        // entity_id should be the root node
        .get(`/api/endpoint/resolver/children?entity_id=${rootEntityID}`)
        .set(commonHeaders)
        .expect(200);

      expect(body.origin.parent_entity_id).to.eql(rootParentEntityID);
      expect(body.origin.entity_id).to.eql(rootEntityID);
      expect(body.origin.events.length).to.greaterThan(0);

      // it should have some children
      expect(body.children.length).to.greaterThan(0);

      // the root will count as 1 should it should have at least 1 child making the value 2 or more
      expect(body.total).to.greaterThan(1);
      // default page size
      expect(body.request_page_size).to.eql(10);
      expect(body.request_page_index).to.eql(0);
      expect(body.result_from_index).to.eql(0);
    });
    it('should paginate correctly', async () => {
      let { body } = await supertest
        // entity_id should be the root node
        .get(`/api/endpoint/resolver/children?entity_id=${rootEntityID}&page_size=1`)
        .set(commonHeaders)
        .expect(200);

      // the root will count as 1 should it should have at least 1 child making the value 2 or more
      expect(body.total).to.greaterThan(1);
      expect(body.request_page_size).to.eql(1);
      expect(body.request_page_index).to.eql(0);
      expect(body.result_from_index).to.eql(0);

      // there should be at least one child of the root
      ({ body } = await supertest
        // entity_id should be the root node
        .get(`/api/endpoint/resolver/children?entity_id=${rootEntityID}&page_size=1&page_index=1`)
        .set(commonHeaders)
        .expect(200));
      // the root will count as 1 should it should have at least 1 child making the value 2 or more
      expect(body.total).to.greaterThan(0);
      expect(body.request_page_size).to.eql(1);
      expect(body.request_page_index).to.eql(1);
      expect(body.result_from_index).to.eql(1);

      // should return no nodes after paginating further
      await supertest
        // entity_id should be the root node
        .get(
          `/api/endpoint/resolver/children?entity_id=${rootEntityID}&page_size=1&page_index=1000`
        )
        .set(commonHeaders)
        .expect(404);
    });
    it('should error on invalid pagination values', async () => {
      await supertest
        .get(`/api/endpoint/resolver/children?entity_id=${rootEntityID}&page_size=0`)
        .set(commonHeaders)
        .expect(400);
      await supertest
        .get(`/api/endpoint/resolver/children?entity_id=${rootEntityID}&page_size=2000`)
        .set(commonHeaders)
        .expect(400);
      await supertest
        .get(`/api/endpoint/resolver/children?entity_id=${rootEntityID}&page_size=-1`)
        .set(commonHeaders)
        .expect(400);
      await supertest
        .get(`/api/endpoint/resolver/children?entity_id=${rootEntityID}&page_index=-1`)
        .set(commonHeaders)
        .expect(400);
    });
    it('should not find any nodes', async () => {
      await supertest
        .get(`/api/endpoint/resolver/children?entity_id=5555`)
        .set(commonHeaders)
        .expect(404);
    });
    it('should return an error for an invalid entity ID', async () => {
      await supertest
        .get(`/api/endpoint/resolver/children?entity_id=endgame|slkdfjs`)
        .set(commonHeaders)
        .expect(400);
    });
  });
}

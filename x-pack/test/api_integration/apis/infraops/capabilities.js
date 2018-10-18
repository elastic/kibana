/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { capabilitiesQuery } from '../../../../plugins/infra/public/containers/capabilities/capabilities.gql_query';
import { get } from 'lodash';

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');

  describe('capabilities', () => {
    before(() => esArchiver.load('infraops'));
    after(() => esArchiver.unload('infraops'));

    it('supports the capabilities container query', () => {
      return client.query({
        query: capabilitiesQuery,
        variables: {
          sourceId: 'default',
          nodeId: 'demo-stack-nginx-01',
          nodeType: 'host'
        }
      }).then(resp => {
        const capabilities = get(resp, 'data.source.capabilitiesByNode');
        expect(capabilities.length).to.be(14);
      });
    });
  });
}


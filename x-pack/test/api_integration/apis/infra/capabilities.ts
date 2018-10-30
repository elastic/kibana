/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { CapabilitiesQuery } from '../../../../plugins/infra/common/graphql/types';
import { capabilitiesQuery } from '../../../../plugins/infra/public/containers/capabilities/capabilities.gql_query';
import { KbnTestProvider } from './types';

const capabilitiesTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');

  describe('capabilities', () => {
    before(() => esArchiver.load('infra'));
    after(() => esArchiver.unload('infra'));

    it('supports the capabilities container query', () => {
      return client
        .query<CapabilitiesQuery.Query>({
          query: capabilitiesQuery,
          variables: {
            sourceId: 'default',
            nodeId: 'demo-stack-nginx-01',
            nodeType: 'host',
          },
        })
        .then(resp => {
          const capabilities = resp.data.source.capabilitiesByNode;
          expect(capabilities.length).to.be(14);
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default capabilitiesTests;

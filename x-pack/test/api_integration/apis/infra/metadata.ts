/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { MetadataQuery } from '../../../../plugins/infra/common/graphql/types';
import { metadataQuery } from '../../../../plugins/infra/public/containers/metadata/metadata.gql_query';
import { KbnTestProvider } from './types';

const metadataTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');

  describe('metadata', () => {
    before(() => esArchiver.load('infra'));
    after(() => esArchiver.unload('infra'));

    it('supports the metadata container query', () => {
      return client
        .query<MetadataQuery.Query>({
          query: metadataQuery,
          variables: {
            sourceId: 'default',
            nodeId: 'demo-stack-nginx-01',
            nodeType: 'host',
          },
        })
        .then(resp => {
          const metadata = resp.data.source.metadataByNode;
          expect(metadata.length).to.be(14);
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default metadataTests;

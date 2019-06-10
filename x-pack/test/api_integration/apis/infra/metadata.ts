/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { metadataQuery } from '../../../../plugins/infra/public/containers/metadata/metadata.gql_query';
import { MetadataQuery } from '../../../../plugins/infra/public/graphql/types';
import { KbnTestProvider } from './types';

const metadataTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');

  describe('metadata', () => {
    describe('7.0.0', () => {
      before(() => esArchiver.load('infra/7.0.0/hosts'));
      after(() => esArchiver.unload('infra/7.0.0/hosts'));

      it('hosts', () => {
        return client
          .query<MetadataQuery.Query>({
            query: metadataQuery,
            variables: {
              sourceId: 'default',
              nodeId: 'demo-stack-mysql-01',
              nodeType: 'host',
            },
          })
          .then(resp => {
            const metadata = resp.data.source.metadataByNode;
            if (metadata) {
              expect(metadata.features.length).to.be(14);
              expect(metadata.name).to.equal('demo-stack-mysql-01');
            } else {
              throw new Error('Metadata should never be empty');
            }
          });
      });
    });

    describe('6.6.0', () => {
      before(() => esArchiver.load('infra/6.6.0/docker'));
      after(() => esArchiver.unload('infra/6.6.0/docker'));

      it('docker', () => {
        return client
          .query<MetadataQuery.Query>({
            query: metadataQuery,
            variables: {
              sourceId: 'default',
              nodeId: '631f36a845514442b93c3fdd2dc91bcd8feb680b8ac5832c7fb8fdc167bb938e',
              nodeType: 'container',
            },
          })
          .then(resp => {
            const metadata = resp.data.source.metadataByNode;
            if (metadata) {
              expect(metadata.features.length).to.be(10);
              expect(metadata.name).to.equal('docker-autodiscovery_elasticsearch_1');
            } else {
              throw new Error('Metadata should never be empty');
            }
          });
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default metadataTests;

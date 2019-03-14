/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

import { metadataQuery } from '../../../../plugins/infra/public/containers/metadata/metadata.gql_query';
import { MetadataQuery } from '../../../../plugins/infra/public/graphql/types';
import { KbnTestProvider } from './types';

const metadataTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');

  describe('metadata', () => {
    describe('docker', () => {
      before(() => esArchiver.load('infra/6.6.0/docker'));
      after(() => esArchiver.unload('infra/6.6.0/docker'));

      it('supports the metadata container query', () => {
        return client
          .query<MetadataQuery.Query>({
            query: metadataQuery,
            variables: {
              sourceId: 'default',
              nodeId: '242fddb9d376bbf0e38025d81764847ee5ec0308adfa095918fd3266f9d06c6a',
              nodeType: 'container',
            },
          })
          .then(resp => {
            const metadata = resp.data.source.metadataByNode;
            if (metadata) {
              expect(metadata.features.length).to.be(8);
              expect(metadata.name).to.equal('docker-autodiscovery_nginx_1');
            } else {
              throw new Error('Metadata should never be empty');
            }
          });
      });
    });

    describe('hosts', () => {
      before(() => esArchiver.load('infra/metrics_and_logs'));
      after(() => esArchiver.unload('infra/metrics_and_logs'));

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
            if (metadata) {
              expect(metadata.features.length).to.be(14);
              expect(metadata.name).to.equal('demo-stack-nginx-01');
            } else {
              throw new Error('Metadata should never be empty');
            }
          });
      });
    });
  });
};

// tslint:disable-next-line no-default-export
export default metadataTests;

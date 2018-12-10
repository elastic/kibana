/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import gql from 'graphql-tag';
import { MetadataQuery } from '../../../../plugins/infra/common/graphql/types';
import { metadataQuery } from '../../../../plugins/infra/public/containers/metadata/metadata.gql_query';
import { KbnTestProvider } from './types';

const serviceMetadataQuery = gql`
  query ServiceMetadataQuery($sourceId: ID!, $start: Float!, $end: Float!, $filterQuery: String) {
    source(id: $sourceId) {
      id
      serviceMetadataBetween(start: $start, end: $end, filterQuery: $filterQuery) {
        name
        hosts
        containers
        pods
        logs
      }
    }
  }
`;

const START_DATE = new Date('2018-10-17T19:42:22.000Z').valueOf();
const END_DATE = new Date('2018-10-17T19:57:21.611Z').valueOf();
const FILTER_QUERY =
  '{"bool":{"should":[{"match":{"beat.hostname":"demo-stack-apache-01"}}],"minimum_should_match":1}}';

const metadataTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');

  describe('metadata apis', () => {
    describe('metadataByNode', () => {
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

    describe('serviceMetadataBetween', () => {
      before(() => esArchiver.load('infra'));
      after(() => esArchiver.unload('infra'));

      it('should return service metadata according to the start and end keys', () => {
        return client
          .query<any>({
            query: serviceMetadataQuery,
            variables: {
              sourceId: 'default',
              start: START_DATE,
              end: END_DATE,
            },
          })
          .then(resp => {
            const serviceMetadata = resp.data.source.serviceMetadataBetween;
            expect(serviceMetadata.length).to.be(8);
          });
      });

      it('should use the filterQuery for filtering', () => {
        return client
          .query<any>({
            query: serviceMetadataQuery,
            variables: {
              sourceId: 'default',
              start: START_DATE,
              end: END_DATE,
              filterQuery: FILTER_QUERY,
            },
          })
          .then(resp => {
            const serviceMetadata = resp.data.source.serviceMetadataBetween;
            expect(serviceMetadata.length).to.be(4);
          });
      });
    });
  });
};

// tslint:disable-next-line no-default-export
export default metadataTests;

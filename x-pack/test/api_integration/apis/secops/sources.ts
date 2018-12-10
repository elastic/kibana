/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { SourceQuery } from '../../../../plugins/secops/common/graphql/types';
import { sourceQuery } from '../../../../plugins/secops/public/containers/source/index.gql_query';

import { KbnTestProvider } from './types';

const sourcesTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('secOpsGraphQLClient');

  describe('sources', () => {
    before(() => esArchiver.load('auditbeat/default'));
    after(() => esArchiver.unload('auditbeat/default'));

    it('Make sure that we get source information when auditbeat indices is there', () => {
      return client
        .query<SourceQuery.Query>({
          query: sourceQuery,
          variables: {
            sourceId: 'default',
          },
        })
        .then(resp => {
          const sourceConfiguration = resp.data.source.configuration;
          const sourceStatus = resp.data.source.status;

          // shipped default values
          expect(sourceConfiguration.auditbeatAlias).to.be('auditbeat-*');
          expect(sourceConfiguration.logAlias).to.be('filebeat-*');

          // test data in x-pack/test/functional/es_archives/auditbeat_test_data/data.json.gz
          expect(sourceStatus.indexFields.length).to.be(345);
          expect(sourceStatus.auditbeatIndices.length).to.be(1);
          expect(sourceStatus.auditbeatIndicesExist).to.be(true);
          expect(sourceStatus.auditbeatAliasExists).to.be(false);
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default sourcesTests;

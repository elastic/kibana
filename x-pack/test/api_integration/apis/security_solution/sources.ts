/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { sourceQuery } from '../../../../plugins/security_solution/public/common/containers/source/index.gql_query';
import { SourceQuery } from '../../../../plugins/security_solution/public/graphql/types';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('securitySolutionGraphQLClient');

  describe('sources', () => {
    before(() => esArchiver.load('auditbeat/default'));
    after(() => esArchiver.unload('auditbeat/default'));

    it('Make sure that we get source information when auditbeat indices is there', async () => {
      const resp = await client.query<SourceQuery.Query>({
        query: sourceQuery,
        variables: {
          sourceId: 'default',
          defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          docValueFields: [],
        },
      });
      const sourceStatus = resp.data.source.status;
      // test data in x-pack/test/functional/es_archives/auditbeat_test_data/data.json.gz
      expect(sourceStatus.indexFields.length).to.be(397);
      expect(sourceStatus.indicesExist).to.be(true);
    });

    it('should find indexes as being available when they exist', async () => {
      const resp = await client.query<SourceQuery.Query>({
        query: sourceQuery,
        variables: {
          sourceId: 'default',
          defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          docValueFields: [],
        },
      });
      const sourceStatus = resp.data.source.status;
      expect(sourceStatus.indicesExist).to.be(true);
    });

    it('should not find indexes as existing when there is an empty array of them', async () => {
      const resp = await client.query<SourceQuery.Query>({
        query: sourceQuery,
        variables: {
          sourceId: 'default',
          defaultIndex: [],
          docValueFields: [],
        },
      });
      const sourceStatus = resp.data.source.status;
      expect(sourceStatus.indicesExist).to.be(false);
    });

    it('should not find indexes as existing when there is a _all within it', async () => {
      const resp = await client.query<SourceQuery.Query>({
        query: sourceQuery,
        variables: {
          sourceId: 'default',
          defaultIndex: ['_all'],
          docValueFields: [],
        },
      });
      const sourceStatus = resp.data.source.status;
      expect(sourceStatus.indicesExist).to.be(false);
    });

    it('should not find indexes as existing when there are empty strings within it', async () => {
      const resp = await client.query<SourceQuery.Query>({
        query: sourceQuery,
        variables: {
          sourceId: 'default',
          defaultIndex: [''],
          docValueFields: [],
        },
      });
      const sourceStatus = resp.data.source.status;
      expect(sourceStatus.indicesExist).to.be(false);
    });

    it('should not find indexes as existing when there are blank spaces within it', async () => {
      const resp = await client.query<SourceQuery.Query>({
        query: sourceQuery,
        variables: {
          sourceId: 'default',
          defaultIndex: ['   '],
          docValueFields: [],
        },
      });
      const sourceStatus = resp.data.source.status;
      expect(sourceStatus.indicesExist).to.be(false);
    });

    it('should find indexes when one is an empty index but the others are valid', async () => {
      const resp = await client.query<SourceQuery.Query>({
        query: sourceQuery,
        variables: {
          sourceId: 'default',
          defaultIndex: ['', 'auditbeat-*'],
          docValueFields: [],
        },
      });
      const sourceStatus = resp.data.source.status;
      expect(sourceStatus.indicesExist).to.be(true);
    });
  });
}

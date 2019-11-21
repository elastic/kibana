/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { sourceQuery } from '../../../../legacy/plugins/siem/public/containers/source/index.gql_query';
import { SourceQuery } from '../../../../legacy/plugins/siem/public/graphql/types';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');

  describe('sources', () => {
    before(() => esArchiver.load('auditbeat/default'));
    after(() => esArchiver.unload('auditbeat/default'));

    it('Make sure that we get source information when auditbeat indices is there', () => {
      return client
        .query<SourceQuery.Query>({
          query: sourceQuery,
          variables: {
            sourceId: 'default',
            defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          },
        })
        .then(resp => {
          const sourceStatus = resp.data.source.status;
          // test data in x-pack/test/functional/es_archives/auditbeat_test_data/data.json.gz
          expect(sourceStatus.indexFields.length).to.be(395);
          expect(sourceStatus.indicesExist).to.be(true);
        });
    });
  });
}

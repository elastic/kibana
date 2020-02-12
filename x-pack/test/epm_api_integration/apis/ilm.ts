/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import {
  getPolicy,
  getIndexWithWithAlias,
} from '../../../plugins/ingest_manager/server/services/epm/elasticsearch/ilm/ilm';

export default function({ getService }: FtrProviderContext) {
  describe('ilm', () => {
    it('setup policy', async () => {
      const policyName = 'foo';
      const es = getService('es');
      const policy = getPolicy();

      const data = await es.transport.request({
        method: 'PUT',
        path: '/_ilm/policy/' + policyName,
        body: policy,
      });

      expect(data.body.acknowledged).to.eql(true);
      expect(data.statusCode).to.eql(200);
    });

    it('setup index with alias', async () => {
      const indexName = 'test-index-with-alias';
      const aliasName = 'alias-to-index';
      const es = getService('es');

      // Delete index first if it exists as otherwise we get an error
      const existsBody = await es.indices.exists({ index: indexName });
      if (existsBody.statusCode === 200) {
        const response = await es.indices.delete({ index: indexName });

        // Sanity check to make sure removal work as expected
        // If it didn't we already know where the problem lays in the test
        expect(response.statusCode).to.eql(200);
      }

      // Calls the given esClient, creates and index and sets it as write index on the given alias.
      //
      // This should be moved later to the ilm lib but have it here for now as passing the client
      // does not work.
      const body = getIndexWithWithAlias(aliasName);
      const data = await es.indices.create({
        index: indexName,
        body,
      });

      // Sanity checks to make sure ES confirmed the data we sent is sane
      // and the index with the alias was created.
      expect(data.body.acknowledged).to.eql(true);
      expect(data.statusCode).to.eql(200);

      // Retreiving the index information again to see if the is_write_index
      // is set correctly for the alias.
      const indexData = await es.indices.get({ index: indexName });
      expect(indexData.body[indexName].aliases[aliasName].is_write_index).to.eql(true);
    });
  });
}

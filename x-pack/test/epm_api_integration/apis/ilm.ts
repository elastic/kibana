/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { getPolicy, createIndexWithAlias } from '../../../legacy/plugins/epm/server/lib/ilm/ilm';

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
      const policy = getPolicy();

      // Delete index first if it exists as otherwise we get an error
      const indexExists = await es.indices.exists({ index: indexName });
      if (indexExists) {
        const response = await es.indices.delete({ index: indexName });
        // Sanity check to make sure removal work as expected
        // If it didn't we already know where the problem lays in the test
        expect(response.statusCode).to.eql(200);
      }

      const data = await createIndexWithAlias(es, indexName, aliasName);
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { mappingsApi } from './lib/mappings.api';
import { indicesHelpers } from './lib/indices.helpers';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');

  const { getMapping, updateMappings } = mappingsApi(getService);
  const { createIndex, deleteAllIndices } = indicesHelpers(getService);

  describe('mappings', () => {
    let indexName: string;

    const mappings = {
      properties: {
        total: { type: 'long' },
        tag: { type: 'keyword' },
        createdAt: { type: 'date' },
      },
    };

    after(async () => await deleteAllIndices());

    before(async () => {
      log.debug('Creating index');
      try {
        indexName = await createIndex(undefined, mappings);
      } catch (err) {
        log.debug('[Setup error] Error creating index');
        throw err;
      }
    });

    after(async () => {
      try {
        await deleteAllIndices();
      } catch (err) {
        log.debug('[Cleanup error] Error deleting index');
        throw err;
      }
    });

    it('should get the index mappings', async () => {
      const { body } = await getMapping(indexName).expect(200);

      expect(body.mappings).to.eql(mappings);
    });
    it('show update the index mappings', async () => {
      await updateMappings(indexName).expect(200);
      const { body } = await getMapping(indexName).expect(200);
      expect(body.mappings).to.eql({
        ...mappings,
        properties: { ...mappings.properties, name: { type: 'text' } },
      });
    });
  });
}

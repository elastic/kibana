/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const indexManagementService = getService('indexManagement');

  describe('mappings', () => {
    let indexName: string;
    let getMapping: typeof indexManagementService['mappings']['api']['getMapping'];
    let createIndex: typeof indexManagementService['indices']['helpers']['createIndex'];
    let deleteAllIndices: typeof indexManagementService['indices']['helpers']['deleteAllIndices'];

    const mappings = {
      properties: {
        total: { type: 'long' },
        tag: { type: 'keyword' },
        createdAt: { type: 'date' },
      },
    };

    before(async () => {
      ({
        indices: {
          helpers: { createIndex, deleteAllIndices },
        },
        mappings: {
          api: { getMapping },
        },
      } = indexManagementService);

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
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { LIST_INDEX } from '@kbn/securitysolution-list-constants';
import { getTemplateExists, getIndexTemplateExists } from '@kbn/securitysolution-es-utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';

import { createLegacyListsIndices, deleteListsIndex } from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('create_list_index_route', () => {
    beforeEach(async () => {
      await deleteListsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteListsIndex(supertest, log);
    });

    it('should create lists data streams', async () => {
      const { body: fetchedIndices } = await supertest
        .get(LIST_INDEX)
        .set('kbn-xsrf', 'true')
        .expect(404);

      expect(fetchedIndices).to.eql({
        message: 'data stream .lists-default and data stream .items-default does not exist',
        status_code: 404,
      });

      await supertest.post(LIST_INDEX).set('kbn-xsrf', 'true').expect(200);

      const { body } = await supertest.get(LIST_INDEX).set('kbn-xsrf', 'true').expect(200);

      expect(body).to.eql({ list_index: true, list_item_index: true });
    });

    it('should migrate lists indices to data streams and remove old legacy templates', async () => {
      // create legacy indices
      await createLegacyListsIndices(es);

      await supertest
        .get(LIST_INDEX)
        .set('kbn-xsrf', 'true')
        // data stream does not exist
        .expect(404);

      // confirm that legacy templates are in use
      const legacyListsTemplateExists = await getTemplateExists(es, '.lists-default');
      const legacyItemsTemplateExists = await getTemplateExists(es, '.items-default');
      const nonLegacyListsTemplateExists = await getIndexTemplateExists(es, '.lists-default');
      const nonLegacyItemsTemplateExists = await getIndexTemplateExists(es, '.items-default');

      expect(legacyListsTemplateExists).to.equal(true);
      expect(legacyItemsTemplateExists).to.equal(true);
      expect(nonLegacyListsTemplateExists).to.equal(false);
      expect(nonLegacyItemsTemplateExists).to.equal(false);

      // migrates old indices to data streams
      await supertest.post(LIST_INDEX).set('kbn-xsrf', 'true').expect(200);

      const { body } = await supertest.get(LIST_INDEX).set('kbn-xsrf', 'true').expect(200);

      const legacyListsTemplateExistsPostMigration = await getTemplateExists(es, '.lists-default');
      const legacyItemsTemplateExistsPostMigration = await getTemplateExists(es, '.items-default');
      const newListsTemplateExists = await getIndexTemplateExists(es, '.lists-default');
      const newItemsTemplateExists = await getIndexTemplateExists(es, '.items-default');

      expect(legacyListsTemplateExistsPostMigration).to.equal(false);
      expect(legacyItemsTemplateExistsPostMigration).to.equal(false);
      expect(newListsTemplateExists).to.equal(true);
      expect(newItemsTemplateExists).to.equal(true);

      expect(body).to.eql({ list_index: true, list_item_index: true });
    });
  });
};

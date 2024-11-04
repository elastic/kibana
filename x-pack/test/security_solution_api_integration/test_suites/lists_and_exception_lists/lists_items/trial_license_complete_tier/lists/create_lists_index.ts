/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { LIST_INDEX } from '@kbn/securitysolution-list-constants';

import TestAgent from 'supertest/lib/agent';
import { deleteListsIndex } from '../../../utils';

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  describe('@ess @serverless @serverlessQA create_list_index_route', () => {
    let supertest: TestAgent;

    before(async () => {
      supertest = await utils.createSuperTest();
    });

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
  });
};

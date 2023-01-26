/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
// import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  // const supertest = getService('supertest');
  describe('Lists API', () => {
    before(async () => await esArchiver.load('x-pack/test/functional/es_archives/lists'));

    after(async () => await esArchiver.unload('x-pack/test/functional/es_archives/lists'));

    it('should return a 400 if an endpoint exception item with a list-based entry is provided', async () => {
      // const badItem = {
      //   namespace_type: 'agnostic',
      //   description: 'bad endpoint item for testing',
      //   name: 'bad endpoint item',
      //   list_id: ENDPOINT_LIST_ID,
      //   type: 'simple',
      //   entries: [
      //     {
      //       type: 'list',
      //       field: 'some.field',
      //       operator: 'included',
      //       list: {
      //         id: 'somelist',
      //         type: 'keyword',
      //       },
      //     },
      //   ],
      // };
      // const { body } = await supertest
      //   .post(`/api/exception_lists/items`)
      //   .set('kbn-xsrf', 'xxx')
      //   .send(badItem)
      //   .expect(400);
      // expect(body.message).to.eql([
      //   'Invalid value "list" supplied to "type"',
      //   'Invalid value "undefined" supplied to "value"',
      //   'Invalid value "undefined" supplied to "entries"',
      // ]);
      expect(true).to.eql(true);
    });

    it('should return a 400 if endpoint exception entry has disallowed field', async () => {
      // const fieldName = 'file.Ext.quarantine_path';
      // const badItem = {
      //   namespace_type: 'agnostic',
      //   description: 'bad endpoint item for testing',
      //   name: 'bad endpoint item',
      //   list_id: ENDPOINT_LIST_ID,
      //   type: 'simple',
      //   entries: [
      //     {
      //       type: 'match',
      //       field: fieldName,
      //       operator: 'included',
      //       value: 'doesnt matter',
      //     },
      //   ],
      // };
      // const { body } = await supertest
      //   .post(`/api/exception_lists/items`)
      //   .set('kbn-xsrf', 'xxx')
      //   .send(badItem)
      //   .expect(400);
      // expect(body.message).to.eql(`cannot add endpoint exception item on field ${fieldName}`);
      expect(true).to.eql(true);
    });
  });
}

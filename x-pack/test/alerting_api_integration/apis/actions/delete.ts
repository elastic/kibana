/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { ES_ARCHIVER_ACTION_ID, SPACE_1_ES_ARCHIVER_ACTION_ID } from './constants';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function deleteActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('delete', () => {
    beforeEach(() => esArchiver.load('actions/basic'));
    afterEach(() => esArchiver.unload('actions/basic'));

    it('should return 204 when deleting an action', async () => {
      await supertest
        .delete(`/api/action/${ES_ARCHIVER_ACTION_ID}`)
        .set('kbn-xsrf', 'foo')
        .expect(204, '');
    });

    it('should return 204 when deleting an action in a space', async () => {
      await supertest
        .delete(`/s/space_1/api/action/${SPACE_1_ES_ARCHIVER_ACTION_ID}`)
        .set('kbn-xsrf', 'foo')
        .expect(204, '');
    });

    it('should return 404 when deleting an action in another space', async () => {
      await supertest
        .delete(`/api/action/${SPACE_1_ES_ARCHIVER_ACTION_ID}`)
        .set('kbn-xsrf', 'foo')
        .expect(404);
    });

    it(`should return 404 when action doesn't exist`, async () => {
      await supertest
        .delete('/api/action/2')
        .set('kbn-xsrf', 'foo')
        .expect(404)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 404,
            error: 'Not Found',
            message: 'Saved object [action/2] not found',
          });
        });
    });
  });
}

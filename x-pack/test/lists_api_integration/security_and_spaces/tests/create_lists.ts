/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import { LIST_URL } from 'x-pack/plugins/lists/common/constants';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('create_lists', () => {
    describe('validation errors', () => {
      it('should give an error that the index must exist first if it does not exist before creating a rule', async () => {
        const { body } = await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getSimpleRule())
          .expect(400);

        expect(body).to.eql({
          message:
            'To create a rule, the index must exist first. Index .siem-signals-default does not exist',
          status_code: 400,
        });
      });
    });
  });
});

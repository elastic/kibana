/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL, CASE_REPORTERS_URL } from '../../../../../../plugins/case/common/constants';
import { defaultUser, postCaseReq } from '../../../../common/lib/mock';
import { deleteCases } from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_reporters', () => {
    afterEach(async () => {
      await deleteCases(es);
    });

    it('should return reporters', async () => {
      await supertest.post(CASES_URL).set('kbn-xsrf', 'true').send(postCaseReq).expect(200);

      const { body } = await supertest
        .get(CASE_REPORTERS_URL)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body).to.eql([defaultUser]);
    });
  });
};

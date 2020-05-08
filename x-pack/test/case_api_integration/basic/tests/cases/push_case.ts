/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { CASE_CONFIGURE_URL, CASES_URL } from '../../../../../plugins/case/common/constants';
import { postCaseReq, defaultUser } from '../../../common/lib/mock';
import {
  deleteCases,
  deleteCasesUserActions,
  deleteConfiguration,
  getConfiguration,
} from '../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('push_case', () => {
    afterEach(async () => {
      await deleteCases(es);
      await deleteConfiguration(es);
      await deleteCasesUserActions(es);
    });

    it('should push a case', async () => {
      const { body: configure } = await supertest
        .post(CASE_CONFIGURE_URL)
        .set('kbn-xsrf', 'true')
        .send(getConfiguration())
        .expect(200);
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/_push`)
        .set('kbn-xsrf', 'true')
        .send({
          connector_id: configure.connector_id,
          connector_name: configure.connector_name,
          external_id: 'external_id',
          external_title: 'external_title',
          external_url: 'external_url',
        })
        .expect(200);

      expect(body.connector_id).to.eql(configure.connector_id);
      expect(body.external_service.pushed_by).to.eql(defaultUser);
    });
  });
};

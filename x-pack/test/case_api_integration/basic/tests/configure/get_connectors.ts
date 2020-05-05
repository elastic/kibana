/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { CASE_CONFIGURE_CONNECTORS_URL } from '../../../../../plugins/case/common/constants';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  describe('get_connectors', () => {
    it('should return an empty find body correctly if no connectors are loaded', async () => {
      const { body } = await supertest
        .get(`${CASE_CONFIGURE_CONNECTORS_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body).to.eql([]);
    });
  });
};

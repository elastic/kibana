/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { CASE_CONFIGURE_CONNECTORS_URL } from '../../../../../../plugins/cases/common/constants';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const actionsRemover = new ActionsRemover(supertest);

  describe('get_connectors', () => {
    afterEach(async () => {
      await actionsRemover.removeAll();
    });

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

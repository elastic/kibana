/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_URL } from '@kbn/cases-plugin/common/constants';
import { getPostCaseRequest } from './mock';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  describe.only('post_case', () => {
    it('400s when trying to create case', async () => {
      await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(getPostCaseRequest())
        .expect(400);
    });
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { CASES_URL } from '@kbn/cases-plugin/common/constants';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  describe('find_cases', () => {
    it('403 when find cases', async () => {
      await supertest.get(`${CASES_URL}/_find`)
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo')
        .expect(403);
    });
  });
};

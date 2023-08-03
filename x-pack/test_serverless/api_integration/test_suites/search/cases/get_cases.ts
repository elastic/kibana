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

  describe('get_cases using alertID', () => {
    it('400 when trying get cases using alertID', async () => {
      await supertest
        .get(
          `${CASES_URL}/alerts/test-id`
        )
        .expect(400);
    });;
  });
};

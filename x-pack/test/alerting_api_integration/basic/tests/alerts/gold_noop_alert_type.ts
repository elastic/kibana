/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTestRuleData } from '../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function emailTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('create gold noop rule', () => {
    it('should return 403 when creating an gold rule', async () => {
      await supertest
        .post(`/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ rule_type_id: 'test.gold.noop' }))
        .expect(403, {
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Rule test.gold.noop is disabled because it requires a Gold license. Go to License Management to view upgrade options.',
        });
    });
  });
}

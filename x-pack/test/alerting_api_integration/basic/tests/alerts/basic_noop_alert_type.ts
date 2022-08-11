/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTestRuleData } from '../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function basicRuleTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('basic rule', () => {
    it('should return 200 when creating a basic license rule', async () => {
      await supertest
        .post(`/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { devToolPrebuiltContentPath } from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Prebuilt dev tools content', () => {
    it('get content for enable host risk score via dev tools', async () => {
      const response = await supertest
        .get(devToolPrebuiltContentPath(`enable_host_risk_score`))
        .set('kbn-xsrf', 'true');

      expect(response.status).to.be(200);
    });

    it('get content for enable user risk score via dev tools', async () => {
      const response = await supertest
        .get(devToolPrebuiltContentPath('enable_user_risk_score'))
        .set('kbn-xsrf', 'true');

      expect(response.status).to.be(200);
    });
  });
}

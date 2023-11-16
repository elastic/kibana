/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esSupertest = getService('esSupertest');

  describe('during basic startup', () => {
    describe('ping endpoint', () => {
      it('returns a successful response', async () => {
        const response = await supertest.get('/api/asset-manager/ping').expect(200);
        expect(response.body).to.eql({ message: 'Asset Manager OK' });
      });
    });

    describe('assets index templates', () => {
      it('should always be installed', async () => {
        await esSupertest.get('/_index_template/assets').expect(200);
      });
    });
  });
}

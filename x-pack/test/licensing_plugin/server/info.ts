/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Info', () => {
    describe('GET /api/licensing/info', function () {
      this.tags('skipFIPS');
      it('returns licensing information', async () => {
        const response = await supertest.get('/api/licensing/info').expect(200);

        expect(response.body).property('features');
        expect(response.body).property('license');
        expect(response.body).property('signature');
      });

      it('returns a correct license type', async () => {
        const response = await supertest.get('/api/licensing/info').expect(200);

        expect(response.body.license.type).to.be('basic');
      });
    });
  });
}

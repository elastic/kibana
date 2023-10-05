/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esSupertest = getService('esSupertest');

  describe('Asset Manager API Endpoints - when NOT enabled', () => {
    describe('basic ping endpoint', () => {
      it('returns a 404 response', async () => {
        await supertest.get('/api/asset-manager/ping').expect(404);
      });
    });

    describe('assets index templates', () => {
      it('should not be installed', async () => {
        await esSupertest.get('/_index_template/assets').expect(404);
      });
    });
  });
}

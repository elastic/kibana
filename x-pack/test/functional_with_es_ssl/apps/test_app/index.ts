/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const esSupertest = getService('esSupertest');
  const kbnSupertest = getService('supertest');

  describe('Some test app', function () {
    this.tags(['ciGroup13', 'test-app']);

    it('should request the Kibana API successfully', async () => {
      await kbnSupertest.get('/api/status').expect(200);
    });

    it('should request the ES API successfully', async () => {
      await esSupertest.get(`/`).expect(200);
    });
  });
};

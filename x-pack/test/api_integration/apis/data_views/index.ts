/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  describe('data view api and spaces', function () {
    const spacesService = getService('spaces');
    const supertest = getService('supertest');

    before(async () => {
      await spacesService.delete('test');
    });

    it('should be able to create data view WITHOUT space access', async () => {
      await spacesService.create({
        id: 'test',
        name: 'Test-Space',
        disabledFeatures: ['indexPatterns'],
      });

      await supertest
        .post('/s/test/api/data_views/data_view')
        .set('kbn-xsrf', 'xxx')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          data_view: {
            title: 'logs-*',
            name: 'Logs DV',
          },
        })
        .expect(200);
    });
  });
}

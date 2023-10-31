/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { dataViewConfig } from '../../constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const svlCommonApi = getService('svlCommonApi');

  describe('main', () => {
    describe('get data views api', () => {
      it('returns list of data views', async () => {
        const response = await supertest
          .get(dataViewConfig.basePath)
          // TODO: API requests in Serverless require internal request headers
          .set(svlCommonApi.getInternalRequestHeader());
        expect(response.status).to.be(200);
        expect(response.body).to.have.property(dataViewConfig.serviceKey);
        expect(response.body[dataViewConfig.serviceKey]).to.be.an('array');
      });
    });
  });
}

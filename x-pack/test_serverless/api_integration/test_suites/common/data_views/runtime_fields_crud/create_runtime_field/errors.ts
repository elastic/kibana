/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { configArray } from '../../constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const svlCommonApi = getService('svlCommonApi');

  describe('errors', () => {
    configArray.forEach((config) => {
      describe(config.name, () => {
        it('returns an error field object is not provided', async () => {
          const title = `foo-${Date.now()}-${Math.random()}*`;
          const response1 = await supertest
            .post(config.path)
            // TODO: API requests in Serverless require internal request headers
            .set(svlCommonApi.getInternalRequestHeader())
            .send({
              [config.serviceKey]: {
                title,
              },
            });
          const id = response1.body[config.serviceKey].id;
          const response2 = await supertest
            .post(`${config.path}/${id}/runtime_field`)
            // TODO: API requests in Serverless require internal request headers
            .set(svlCommonApi.getInternalRequestHeader())
            .send({});

          expect(response2.status).to.be(400);
          expect(response2.body.statusCode).to.be(400);
          expect(response2.body.message).to.be(
            '[request body.name]: expected value of type [string] but got [undefined]'
          );
        });
      });
    });
  });
}

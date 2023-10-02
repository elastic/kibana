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
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const svlCommonApi = getService('svlCommonApi');

  describe('errors', () => {
    const basicIndex = 'b*sic_index';
    let indexPattern: any;

    configArray.forEach((config) => {
      describe(config.name, () => {
        before(async () => {
          await esArchiver.load(
            'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
          );

          indexPattern = (
            await supertest
              .post(config.path)
              // TODO: API requests in Serverless require internal request headers
              .set(svlCommonApi.getInternalRequestHeader())
              .send({
                [config.serviceKey]: {
                  title: basicIndex,
                },
              })
          ).body[config.serviceKey];
        });

        after(async () => {
          await esArchiver.unload(
            'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
          );

          if (indexPattern) {
            await supertest
              .delete(`${config.path}/${indexPattern.id}`)
              // TODO: API requests in Serverless require internal request headers
              .set(svlCommonApi.getInternalRequestHeader());
          }
        });

        it('returns 404 error on non-existing index_pattern', async () => {
          const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
          const response = await supertest
            .delete(`${config.path}/${id}/runtime_field/foo`)
            // TODO: API requests in Serverless require internal request headers
            .set(svlCommonApi.getInternalRequestHeader());

          expect(response.status).to.be(404);
        });

        it('returns 404 error on non-existing runtime field', async () => {
          const response1 = await supertest
            .delete(`${config.path}/${indexPattern.id}/runtime_field/test`)
            // TODO: API requests in Serverless require internal request headers
            .set(svlCommonApi.getInternalRequestHeader());

          expect(response1.status).to.be(404);
        });

        it('returns error when ID is too long', async () => {
          const id = `xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx`;
          const response = await supertest
            .delete(`${config.path}/${id}/runtime_field/foo`)
            // TODO: API requests in Serverless require internal request headers
            .set(svlCommonApi.getInternalRequestHeader());

          expect(response.status).to.be(400);
          expect(response.body.message).to.be(
            '[request params.id]: value has length [1759] but it must have a maximum length of [1000].'
          );
        });
      });
    });
  });
}

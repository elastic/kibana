/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { PutTransformsRequestSchema } from '@kbn/transform-plugin/common/api_schemas/transforms';
import type { StopTransformsRequestSchema } from '@kbn/transform-plugin/common/api_schemas/stop_transforms';
import { isStopTransformsResponseSchema } from '@kbn/transform-plugin/common/api_schemas/type_guards';

import { TRANSFORM_STATE } from '@kbn/transform-plugin/common/constants';

import { COMMON_REQUEST_HEADERS } from '../../../functional/services/ml/common_api';
import { USER } from '../../../functional/services/transform/security_common';

import { FtrProviderContext } from '../../ftr_provider_context';

import { asyncForEach, generateDestIndex, generateTransformConfig } from './common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const transform = getService('transform');

  async function createAndRunTransform(transformId: string) {
    // to be able to test stopping transforms,
    // we create a slow continuous transform
    // so it doesn't stop automatically.
    const config: PutTransformsRequestSchema = {
      ...generateTransformConfig(transformId),
      settings: {
        docs_per_second: 10,
        max_page_search_size: 10,
      },
      sync: {
        time: { field: '@timestamp' },
      },
    };

    await transform.api.createAndRunTransform(transformId, config);
  }

  describe('/api/transform/stop_transforms', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
    });

    describe('single transform stop', function () {
      const transformId = 'transform-test-stop';
      const destinationIndex = generateDestIndex(transformId);

      beforeEach(async () => {
        await createAndRunTransform(transformId);
      });

      afterEach(async () => {
        await transform.api.cleanTransformIndices();
        await transform.api.deleteIndices(destinationIndex);
      });

      it('should stop the transform by transformId', async () => {
        const reqBody: StopTransformsRequestSchema = [
          { id: transformId, state: TRANSFORM_STATE.STARTED },
        ];
        const { body, status } = await supertest
          .post(`/api/transform/stop_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);

        expect(isStopTransformsResponseSchema(body)).to.eql(true);
        expect(body[transformId].success).to.eql(true);
        expect(typeof body[transformId].error).to.eql('undefined');
        await transform.api.waitForTransformState(transformId, TRANSFORM_STATE.STOPPED);
        await transform.api.waitForIndicesToExist(destinationIndex);
      });

      it('should return 200 with success:false for unauthorized user', async () => {
        const reqBody: StopTransformsRequestSchema = [
          { id: transformId, state: TRANSFORM_STATE.STARTED },
        ];
        const { body, status } = await supertest
          .post(`/api/transform/stop_transforms`)
          .auth(
            USER.TRANSFORM_VIEWER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);

        expect(isStopTransformsResponseSchema(body)).to.eql(true);
        expect(body[transformId].success).to.eql(false);
        expect(typeof body[transformId].error).to.eql('object');

        await transform.api.waitForTransformStateNotToBe(transformId, TRANSFORM_STATE.STOPPED);
        await transform.api.waitForIndicesToExist(destinationIndex);
      });
    });

    describe('single transform stop with invalid transformId', function () {
      it('should return 200 with error in response if invalid transformId', async () => {
        const reqBody: StopTransformsRequestSchema = [
          { id: 'invalid_transform_id', state: TRANSFORM_STATE.STARTED },
        ];
        const { body, status } = await supertest
          .post(`/api/transform/stop_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);

        expect(isStopTransformsResponseSchema(body)).to.eql(true);
        expect(body.invalid_transform_id.success).to.eql(false);
        expect(body.invalid_transform_id).to.have.property('error');
      });
    });

    describe('bulk stop', function () {
      const reqBody: StopTransformsRequestSchema = [
        { id: 'bulk_stop_test_1', state: TRANSFORM_STATE.STARTED },
        { id: 'bulk_stop_test_2', state: TRANSFORM_STATE.STARTED },
      ];
      const destinationIndices = reqBody.map((d) => generateDestIndex(d.id));

      beforeEach(async () => {
        await asyncForEach(reqBody, async ({ id }: { id: string }, idx: number) => {
          await createAndRunTransform(id);
        });
      });

      afterEach(async () => {
        await transform.api.cleanTransformIndices();
        await asyncForEach(destinationIndices, async (destinationIndex: string) => {
          await transform.api.deleteIndices(destinationIndex);
        });
      });

      it('should stop multiple transforms by transformIds', async () => {
        const { body, status } = await supertest
          .post(`/api/transform/stop_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);

        expect(isStopTransformsResponseSchema(body)).to.eql(true);

        await asyncForEach(reqBody, async ({ id: transformId }: { id: string }, idx: number) => {
          expect(body[transformId].success).to.eql(true);
          await transform.api.waitForTransformState(transformId, TRANSFORM_STATE.STOPPED);
          await transform.api.waitForIndicesToExist(destinationIndices[idx]);
        });
      });

      it('should stop multiple transforms by transformIds, even if one of the transformIds is invalid', async () => {
        const invalidTransformId = 'invalid_transform_id';
        const { body, status } = await supertest
          .post(`/api/transform/stop_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send([
            { id: reqBody[0].id, state: reqBody[0].state },
            { id: invalidTransformId, state: TRANSFORM_STATE.STOPPED },
            { id: reqBody[1].id, state: reqBody[1].state },
          ]);
        transform.api.assertResponseStatusCode(200, status, body);

        expect(isStopTransformsResponseSchema(body)).to.eql(true);

        await asyncForEach(reqBody, async ({ id: transformId }: { id: string }, idx: number) => {
          expect(body[transformId].success).to.eql(true);
          await transform.api.waitForTransformState(transformId, TRANSFORM_STATE.STOPPED);
          await transform.api.waitForIndicesToExist(destinationIndices[idx]);
        });

        expect(body[invalidTransformId].success).to.eql(false);
        expect(body[invalidTransformId]).to.have.property('error');
      });
    });
  });
};

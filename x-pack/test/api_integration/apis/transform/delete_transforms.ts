/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DeleteTransformsRequestSchema } from '../../../../plugins/transform/common/api_schemas/delete_transforms';
import { TRANSFORM_STATE } from '../../../../plugins/transform/common/constants';

import { COMMON_REQUEST_HEADERS } from '../../../functional/services/ml/common_api';
import { USER } from '../../../functional/services/transform/security_common';

import { FtrProviderContext } from '../../ftr_provider_context';

import { asyncForEach, generateDestIndex, generateTransformConfig } from './common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const transform = getService('transform');

  async function createTransform(transformId: string) {
    const config = generateTransformConfig(transformId);
    await transform.api.createTransform(transformId, config);
  }

  describe('/api/transform/delete_transforms', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await transform.api.cleanTransformIndices();
    });

    describe('single transform deletion', function () {
      const transformId = 'transform-test-delete';
      const destinationIndex = generateDestIndex(transformId);

      beforeEach(async () => {
        await createTransform(transformId);
        await transform.api.createIndices(destinationIndex);
      });

      afterEach(async () => {
        await transform.api.deleteIndices(destinationIndex);
      });

      it('should delete transform by transformId', async () => {
        const reqBody: DeleteTransformsRequestSchema = {
          transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
        };
        const { body, status } = await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);

        expect(body[transformId].transformDeleted.success).to.eql(true);
        expect(body[transformId].destIndexDeleted.success).to.eql(false);
        expect(body[transformId].destIndexPatternDeleted.success).to.eql(false);
        await transform.api.waitForTransformNotToExist(transformId);
        await transform.api.waitForIndicesToExist(destinationIndex);
      });

      it('should return 403 for unauthorized user', async () => {
        const reqBody: DeleteTransformsRequestSchema = {
          transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
        };
        const { body, status } = await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_VIEWER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send(reqBody);
        transform.api.assertResponseStatusCode(403, status, body);

        await transform.api.waitForTransformToExist(transformId);
        await transform.api.waitForIndicesToExist(destinationIndex);
      });
    });

    describe('single transform deletion with invalid transformId', function () {
      it('should return 200 with error in response if invalid transformId', async () => {
        const reqBody: DeleteTransformsRequestSchema = {
          transformsInfo: [{ id: 'invalid_transform_id', state: TRANSFORM_STATE.STOPPED }],
        };
        const { body, status } = await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);

        expect(body.invalid_transform_id.transformDeleted.success).to.eql(false);
        expect(body.invalid_transform_id.transformDeleted).to.have.property('error');
      });
    });

    describe('bulk deletion', function () {
      const reqBody: DeleteTransformsRequestSchema = {
        transformsInfo: [
          { id: 'bulk_delete_test_1', state: TRANSFORM_STATE.STOPPED },
          { id: 'bulk_delete_test_2', state: TRANSFORM_STATE.STOPPED },
        ],
      };
      const destinationIndices = reqBody.transformsInfo.map((d) => generateDestIndex(d.id));

      beforeEach(async () => {
        await asyncForEach(reqBody.transformsInfo, async ({ id }: { id: string }, idx: number) => {
          await createTransform(id);
          await transform.api.createIndices(destinationIndices[idx]);
        });
      });

      afterEach(async () => {
        await asyncForEach(destinationIndices, async (destinationIndex: string) => {
          await transform.api.deleteIndices(destinationIndex);
        });
      });

      it('should delete multiple transforms by transformIds', async () => {
        const { body, status } = await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);

        await asyncForEach(
          reqBody.transformsInfo,
          async ({ id: transformId }: { id: string }, idx: number) => {
            expect(body[transformId].transformDeleted.success).to.eql(true);
            expect(body[transformId].destIndexDeleted.success).to.eql(false);
            expect(body[transformId].destIndexPatternDeleted.success).to.eql(false);
            await transform.api.waitForTransformNotToExist(transformId);
            await transform.api.waitForIndicesToExist(destinationIndices[idx]);
          }
        );
      });

      it('should delete multiple transforms by transformIds, even if one of the transformIds is invalid', async () => {
        const invalidTransformId = 'invalid_transform_id';
        const { body, status } = await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send({
            ...reqBody,
            transformsInfo: [
              ...reqBody.transformsInfo,
              { id: invalidTransformId, state: TRANSFORM_STATE.STOPPED },
            ],
          });
        transform.api.assertResponseStatusCode(200, status, body);

        await asyncForEach(
          reqBody.transformsInfo,
          async ({ id: transformId }: { id: string }, idx: number) => {
            expect(body[transformId].transformDeleted.success).to.eql(true);
            expect(body[transformId].destIndexDeleted.success).to.eql(false);
            expect(body[transformId].destIndexPatternDeleted.success).to.eql(false);
            await transform.api.waitForTransformNotToExist(transformId);
            await transform.api.waitForIndicesToExist(destinationIndices[idx]);
          }
        );

        expect(body[invalidTransformId].transformDeleted.success).to.eql(false);
        expect(body[invalidTransformId].transformDeleted).to.have.property('error');
      });
    });

    describe('with deleteDestIndex setting', function () {
      const transformId = 'test2';
      const destinationIndex = generateDestIndex(transformId);

      before(async () => {
        await createTransform(transformId);
        await transform.api.createIndices(destinationIndex);
      });

      after(async () => {
        await transform.api.deleteIndices(destinationIndex);
      });

      it('should delete transform and destination index', async () => {
        const reqBody: DeleteTransformsRequestSchema = {
          transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
          deleteDestIndex: true,
        };
        const { body, status } = await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);

        expect(body[transformId].transformDeleted.success).to.eql(true);
        expect(body[transformId].destIndexDeleted.success).to.eql(true);
        expect(body[transformId].destIndexPatternDeleted.success).to.eql(false);
        await transform.api.waitForTransformNotToExist(transformId);
        await transform.api.waitForIndicesNotToExist(destinationIndex);
      });
    });

    describe('with deleteDestIndexPattern setting', function () {
      const transformId = 'test3';
      const destinationIndex = generateDestIndex(transformId);

      before(async () => {
        await createTransform(transformId);
        await transform.api.createIndices(destinationIndex);
        await transform.testResources.createIndexPatternIfNeeded(destinationIndex);
      });

      after(async () => {
        await transform.api.deleteIndices(destinationIndex);
        await transform.testResources.deleteIndexPatternByTitle(destinationIndex);
      });

      it('should delete transform and destination index pattern', async () => {
        const reqBody: DeleteTransformsRequestSchema = {
          transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
          deleteDestIndex: false,
          deleteDestIndexPattern: true,
        };
        const { body, status } = await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);

        expect(body[transformId].transformDeleted.success).to.eql(true);
        expect(body[transformId].destIndexDeleted.success).to.eql(false);
        expect(body[transformId].destIndexPatternDeleted.success).to.eql(true);
        await transform.api.waitForTransformNotToExist(transformId);
        await transform.api.waitForIndicesToExist(destinationIndex);
        await transform.testResources.assertIndexPatternNotExist(destinationIndex);
      });
    });

    describe('with deleteDestIndex & deleteDestIndexPattern setting', function () {
      const transformId = 'test4';
      const destinationIndex = generateDestIndex(transformId);

      before(async () => {
        await createTransform(transformId);
        await transform.api.createIndices(destinationIndex);
        await transform.testResources.createIndexPatternIfNeeded(destinationIndex);
      });

      after(async () => {
        await transform.api.deleteIndices(destinationIndex);
        await transform.testResources.deleteIndexPatternByTitle(destinationIndex);
      });

      it('should delete transform, destination index, & destination index pattern', async () => {
        const reqBody: DeleteTransformsRequestSchema = {
          transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
          deleteDestIndex: true,
          deleteDestIndexPattern: true,
        };
        const { body, status } = await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);

        expect(body[transformId].transformDeleted.success).to.eql(true);
        expect(body[transformId].destIndexDeleted.success).to.eql(true);
        expect(body[transformId].destIndexPatternDeleted.success).to.eql(true);
        await transform.api.waitForTransformNotToExist(transformId);
        await transform.api.waitForIndicesNotToExist(destinationIndex);
        await transform.testResources.assertIndexPatternNotExist(destinationIndex);
      });
    });
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { TransformEndpointRequest } from '../../../../plugins/transform/common';
import { FtrProviderContext } from '../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../functional/services/ml/common';
import { USER } from '../../../functional/services/transform/security_common';

async function asyncForEach(array: any[], callback: Function) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const transform = getService('transform');

  function generateDestIndex(transformId: string): string {
    return `user-${transformId}`;
  }

  async function createTransform(transformId: string, destinationIndex: string) {
    const config = {
      id: transformId,
      source: { index: ['farequote-*'] },
      pivot: {
        group_by: { airline: { terms: { field: 'airline' } } },
        aggregations: { '@timestamp.value_count': { value_count: { field: '@timestamp' } } },
      },
      dest: { index: destinationIndex },
    };

    await transform.api.createTransform(config);
  }

  describe('delete_transforms', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await transform.api.cleanTransformIndices();
    });

    describe('single transform deletion', function () {
      const transformId = 'test1';
      const destinationIndex = generateDestIndex(transformId);

      beforeEach(async () => {
        await createTransform(transformId, destinationIndex);
        await transform.api.createIndices(destinationIndex);
      });

      afterEach(async () => {
        await transform.api.deleteIndices(destinationIndex);
      });

      it('should delete transform by transformId', async () => {
        const transformsInfo: TransformEndpointRequest[] = [{ id: transformId }];
        const { body } = await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send({
            transformsInfo,
          })
          .expect(200);

        expect(body[transformId].transformDeleted.success).to.eql(true);
        expect(body[transformId].destIndexDeleted.success).to.eql(false);
        expect(body[transformId].destIndexPatternDeleted.success).to.eql(false);
        await transform.api.waitForTransformNotToExist(transformId);
        await transform.api.waitForIndicesToExist(destinationIndex);
      });

      it('should return 403 for unauthorized user', async () => {
        const transformsInfo: TransformEndpointRequest[] = [{ id: transformId }];
        await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_VIEWER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send({
            transformsInfo,
          })
          .expect(403);
        await transform.api.waitForTransformToExist(transformId);
        await transform.api.waitForIndicesToExist(destinationIndex);
      });
    });

    describe('single transform deletion with invalid transformId', function () {
      it('should return 200 with error in response if invalid transformId', async () => {
        const transformsInfo: TransformEndpointRequest[] = [{ id: 'invalid_transform_id' }];
        const { body } = await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send({
            transformsInfo,
          })
          .expect(200);
        expect(body.invalid_transform_id.transformDeleted.success).to.eql(false);
        expect(body.invalid_transform_id.transformDeleted).to.have.property('error');
      });
    });

    describe('bulk deletion', function () {
      const transformsInfo: TransformEndpointRequest[] = [
        { id: 'bulk_delete_test_1' },
        { id: 'bulk_delete_test_2' },
      ];
      const destinationIndices = transformsInfo.map((d) => generateDestIndex(d.id));

      beforeEach(async () => {
        await asyncForEach(transformsInfo, async ({ id }: { id: string }, idx: number) => {
          await createTransform(id, destinationIndices[idx]);
          await transform.api.createIndices(destinationIndices[idx]);
        });
      });

      afterEach(async () => {
        await asyncForEach(destinationIndices, async (destinationIndex: string) => {
          await transform.api.deleteIndices(destinationIndex);
        });
      });

      it('should delete multiple transforms by transformIds', async () => {
        const { body } = await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send({
            transformsInfo,
          })
          .expect(200);

        await asyncForEach(
          transformsInfo,
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
        const { body } = await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send({
            transformsInfo: [
              { id: transformsInfo[0].id },
              { id: invalidTransformId },
              { id: transformsInfo[1].id },
            ],
          })
          .expect(200);

        await asyncForEach(
          transformsInfo,
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
        await createTransform(transformId, destinationIndex);
        await transform.api.createIndices(destinationIndex);
      });

      after(async () => {
        await transform.api.deleteIndices(destinationIndex);
      });

      it('should delete transform and destination index', async () => {
        const transformsInfo: TransformEndpointRequest[] = [{ id: transformId }];
        const { body } = await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send({
            transformsInfo,
            deleteDestIndex: true,
          })
          .expect(200);

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
        await createTransform(transformId, destinationIndex);
        await transform.api.createIndices(destinationIndex);
        await transform.testResources.createIndexPatternIfNeeded(destinationIndex);
      });

      after(async () => {
        await transform.api.deleteIndices(destinationIndex);
        await transform.testResources.deleteIndexPatternByTitle(destinationIndex);
      });

      it('should delete transform and destination index pattern', async () => {
        const transformsInfo: TransformEndpointRequest[] = [{ id: transformId }];
        const { body } = await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send({
            transformsInfo,
            deleteDestIndex: false,
            deleteDestIndexPattern: true,
          })
          .expect(200);

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
        await createTransform(transformId, destinationIndex);
        await transform.api.createIndices(destinationIndex);
        await transform.testResources.createIndexPatternIfNeeded(destinationIndex);
      });

      after(async () => {
        await transform.api.deleteIndices(destinationIndex);
        await transform.testResources.deleteIndexPatternByTitle(destinationIndex);
      });

      it('should delete transform, destination index, & destination index pattern', async () => {
        const transformsInfo: TransformEndpointRequest[] = [{ id: transformId }];
        const { body } = await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send({
            transformsInfo,
            deleteDestIndex: true,
            deleteDestIndexPattern: true,
          })
          .expect(200);

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

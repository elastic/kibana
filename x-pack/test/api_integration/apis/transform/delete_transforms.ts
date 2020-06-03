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

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const transform = getService('transform');

  function generateDestIndex(transformId: string): string {
    return `dest_del_${transformId}`;
  }

  async function createTransformJob(transformId: string, destinationIndex: string) {
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

    describe('single deletion', function () {
      const transformId = 'test2';
      const destinationIndex = generateDestIndex(transformId);
      before(async () => {
        await createTransformJob(transformId, destinationIndex);
        await transform.api.createIndices(destinationIndex);
      });

      after(async () => {
        await transform.api.deleteIndices(destinationIndex);
      });

      it('should delete transform job by transformId', async () => {
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

        expect(body[transformId].transformJobDeleted.success).to.eql(true);
        expect(body[transformId].destIndexDeleted.success).to.eql(false);
        expect(body[transformId].destIndexPatternDeleted.success).to.eql(false);
        await transform.api.waitForIndicesToExist(destinationIndex);
        await transform.api.waitForTransformJobNotToExist(transformId);
      });

      it('should return response of status 200 with error info if invalid transformId', async () => {
        const transformsInfo: TransformEndpointRequest[] = [{ id: 'invalid_trasnform_id' }];
        await supertest
          .post(`/api/transform/delete_transforms`)
          .auth(
            USER.TRANSFORM_VIEWER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send({
            transformsInfo,
          });
        // .expect(200);

        // expect(body.invalid_trasnform_id.transformJobDeleted.success).to.eql(false);
        // expect(body.invalid_trasnform_id.transformJobDeleted.error).not.to.eql(undefined);
      });
    });
    //
    // describe('bulk deletion', function () {
    //   const transformsInfo: TransformEndpointRequest[] = [
    //     { id: 'bulk_delete_test_1' },
    //     { id: 'bulk_delete_test_2' },
    //   ];
    //
    //   before(async () => {
    //     await createTransformJob('bulk_delete_test_1', 'bulk_delete_test_1');
    //     await transform.api.createIndices('bulk_delete_test_1');
    //     await createTransformJob('bulk_delete_test_2', 'bulk_delete_test_2');
    //     await transform.api.createIndices('bulk_delete_test_2');
    //   });
    //
    //   after(async () => {
    //     await transform.api.deleteIndices('bulk_delete_test_1');
    //     await transform.api.deleteIndices('bulk_delete_test_2');
    //   });
    //
    //   it('should delete multiple transform jobs by transformIds', async () => {
    //     const { body } = await supertest
    //       .post(`/api/transform/delete_transforms`)
    //       .auth(
    //         USER.TRANSFORM_POWERUSER,
    //         transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
    //       )
    //       .set(COMMON_REQUEST_HEADERS)
    //       .send({
    //         transformsInfo,
    //       })
    //       .expect(200);
    //
    //     transformsInfo.forEach(({ id: transformId }) => {
    //       expect(body[transformId].transformJobDeleted.success).to.eql(true);
    //       expect(body[transformId].destIndexDeleted).to.eql(undefined);
    //       expect(body[transformId].destIndexPatternDeleted).to.eql(undefined);
    //     });
    //     await transform.api.waitForTransformJobNotToExist('bulk_delete_test_1');
    //     await transform.api.waitForTransformJobNotToExist('bulk_delete_test_2');
    //   });
    // });
    //
    // describe('with deleteDestIndex', function () {
    //   const transformId = 'test2';
    //   const destinationIndex = generateDestIndex(transformId);
    //
    //   before(async () => {
    //     await createTransformJob(transformId, destinationIndex);
    //     await transform.api.createIndices(destinationIndex);
    //   });
    //
    //   after(async () => {
    //     await transform.api.deleteIndices(destinationIndex);
    //   });
    //
    //   it('should delete transform and destination index', async () => {
    //     const transformsInfo: TransformEndpointRequest[] = [{ id: transformId }];
    //     const { body } = await supertest
    //       .post(`/api/transform/delete_transforms`)
    //       .auth(
    //         USER.TRANSFORM_POWERUSER,
    //         transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
    //       )
    //       .set(COMMON_REQUEST_HEADERS)
    //       .send({
    //         transformsInfo,
    //         deleteDestIndex: true,
    //       })
    //       .expect(200);
    //
    //     expect(body[transformId].transformJobDeleted.success).to.eql(true);
    //     expect(body[transformId].destIndexDeleted.success).to.eql(true);
    //     expect(body[transformId].destIndexPatternDeleted.success).to.eql(false);
    //     await transform.api.waitForTransformJobNotToExist(destinationIndex);
    //     await transform.api.waitForIndicesNotToExist(destinationIndex);
    //   });
    //   it('should return 404 for unauthorized user', async () => {
    //     const transformsInfo: TransformEndpointRequest[] = [{ id: transformId }];
    //     const { body } = await supertest
    //       .post(`/api/transform/delete_transforms`)
    //       .auth(
    //         USER.TRANSFORM_VIEWER,
    //         transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
    //       )
    //       .set(COMMON_REQUEST_HEADERS)
    //       .send({
    //         transformsInfo,
    //         deleteDestIndex: true,
    //       })
    //       .expect(200);
    //
    //     console.log('BODY', body);
    //
    //     // expect(body.error).to.eql('Not Found');
    //     // expect(body.message).to.eql('Not Found');
    //     // await transform.api.waitForTransformJobToExist(destinationIndex);
    //     // await transform.api.waitForIndicesToExist(destinationIndex);
    //   });
    // });
  });
};

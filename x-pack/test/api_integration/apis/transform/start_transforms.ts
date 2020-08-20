/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { StartTransformsRequestSchema } from '../../../../plugins/transform/common/api_schemas/start_transforms';

import { COMMON_REQUEST_HEADERS } from '../../../functional/services/ml/common_api';
import { USER } from '../../../functional/services/transform/security_common';

import { FtrProviderContext } from '../../ftr_provider_context';

import { generateDestIndex, generateTransformConfig } from './common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const transform = getService('transform');

  async function createTransform(transformId: string) {
    const config = generateTransformConfig(transformId);

    await transform.api.createTransform(config);
  }

  describe('/api/transform/start_transforms', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await transform.api.cleanTransformIndices();
    });

    describe('single transform start', function () {
      const transformId = 'test1';
      const destinationIndex = generateDestIndex(transformId);

      beforeEach(async () => {
        await createTransform(transformId);
      });

      afterEach(async () => {
        await transform.api.deleteIndices(destinationIndex);
      });

      it('should start the transform by transformId', async () => {
        const reqBody: StartTransformsRequestSchema = [{ id: transformId }];
        const { body } = await supertest
          .post(`/api/transform/start_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send(reqBody)
          .expect(200);

        expect(body[transformId].success).to.eql(true);
        await transform.api.waitForBatchTransformToComplete(transformId);
        await transform.api.waitForIndicesToExist(destinationIndex);
      });

      // it('should return 403 for unauthorized user', async () => {
      //   const transformsInfo: TransformEndpointRequest[] = [{ id: transformId }];
      //   await supertest
      //     .post(`/api/transform/start_transforms`)
      //     .auth(
      //       USER.TRANSFORM_VIEWER,
      //       transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
      //     )
      //     .set(COMMON_REQUEST_HEADERS)
      //     .send({
      //       transformsInfo,
      //     })
      //     .expect(403);
      //   await transform.api.waitForTransformToExist(transformId);
      //   await transform.api.waitForIndicesToExist(destinationIndex);
      // });
    });

    // describe('single transform start with invalid transformId', function () {
    //   it('should return 200 with error in response if invalid transformId', async () => {
    //     const transformsInfo: TransformEndpointRequest[] = [{ id: 'invalid_transform_id' }];
    //     const { body } = await supertest
    //       .post(`/api/transform/start_transforms`)
    //       .auth(
    //         USER.TRANSFORM_POWERUSER,
    //         transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
    //       )
    //       .set(COMMON_REQUEST_HEADERS)
    //       .send({
    //         transformsInfo,
    //       })
    //       .expect(200);
    //     expect(body.invalid_transform_id.transformDeleted.success).to.eql(false);
    //     expect(body.invalid_transform_id.transformDeleted).to.have.property('error');
    //   });
    // });

    // describe('bulk start', function () {
    //   const transformsInfo: TransformEndpointRequest[] = [
    //     { id: 'bulk_start_test_1' },
    //     { id: 'bulk_start_test_2' },
    //   ];
    //   const destinationIndices = transformsInfo.map((d) => generateDestIndex(d.id));

    //   beforeEach(async () => {
    //     await asyncForEach(transformsInfo, async ({ id }: { id: string }, idx: number) => {
    //       await createTransform(id);
    //       await transform.api.createIndices(destinationIndices[idx]);
    //     });
    //   });

    //   afterEach(async () => {
    //     await asyncForEach(destinationIndices, async (destinationIndex: string) => {
    //       await transform.api.deleteIndices(destinationIndex);
    //     });
    //   });

    // it('should start multiple transforms by transformIds', async () => {
    //   const { body } = await supertest
    //     .post(`/api/transform/start_transforms`)
    //     .auth(
    //       USER.TRANSFORM_POWERUSER,
    //       transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
    //     )
    //     .set(COMMON_REQUEST_HEADERS)
    //     .send({
    //       transformsInfo,
    //     })
    //     .expect(200);

    //   await asyncForEach(
    //     transformsInfo,
    //     async ({ id: transformId }: { id: string }, idx: number) => {
    //       expect(body[transformId].transformDeleted.success).to.eql(true);
    //       expect(body[transformId].destIndexDeleted.success).to.eql(false);
    //       expect(body[transformId].destIndexPatternDeleted.success).to.eql(false);
    //       await transform.api.waitForTransformNotToExist(transformId);
    //       await transform.api.waitForIndicesToExist(destinationIndices[idx]);
    //     }
    //   );
    // });

    //   // it('should start multiple transforms by transformIds, even if one of the transformIds is invalid', async () => {
    //   //   const invalidTransformId = 'invalid_transform_id';
    //   //   const { body } = await supertest
    //   //     .post(`/api/transform/start_transforms`)
    //   //     .auth(
    //   //       USER.TRANSFORM_POWERUSER,
    //   //       transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
    //   //     )
    //   //     .set(COMMON_REQUEST_HEADERS)
    //   //     .send({
    //   //       transformsInfo: [
    //   //         { id: transformsInfo[0].id },
    //   //         { id: invalidTransformId },
    //   //         { id: transformsInfo[1].id },
    //   //       ],
    //   //     })
    //   //     .expect(200);

    //   //   await asyncForEach(
    //   //     transformsInfo,
    //   //     async ({ id: transformId }: { id: string }, idx: number) => {
    //   //       expect(body[transformId].transformDeleted.success).to.eql(true);
    //   //       expect(body[transformId].destIndexDeleted.success).to.eql(false);
    //   //       expect(body[transformId].destIndexPatternDeleted.success).to.eql(false);
    //   //       await transform.api.waitForTransformNotToExist(transformId);
    //   //       await transform.api.waitForIndicesToExist(destinationIndices[idx]);
    //   //     }
    //   //   );

    //   //   expect(body[invalidTransformId].transformDeleted.success).to.eql(false);
    //   //   expect(body[invalidTransformId].transformDeleted).to.have.property('error');
    //   // });
    // });
  });
};

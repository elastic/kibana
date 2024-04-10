/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { ScheduleNowTransformsRequestSchema } from '@kbn/transform-plugin/common/api_schemas/schedule_now_transforms';

import { getCommonRequestHeader } from '../../../functional/services/ml/common_api';
import { USER } from '../../../functional/services/transform/security_common';

import { FtrProviderContext } from '../../ftr_provider_context';

import { asyncForEach, generateDestIndex, generateTransformConfig } from './common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const transform = getService('transform');

  async function createTransform(transformId: string) {
    const config = generateTransformConfig(transformId, true);
    await transform.api.createTransform(transformId, config);
  }

  describe('/internal/transform/schedule_now_transforms', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
    });

    describe('single transform _schedule_now', function () {
      const transformId = 'transform-test-schedule-now';
      const destinationIndex = generateDestIndex(transformId);

      beforeEach(async () => {
        await createTransform(transformId);
        await transform.api.startTransform(transformId);
      });

      afterEach(async () => {
        await transform.api.stopTransform(transformId);
        await transform.api.cleanTransformIndices();
        await transform.api.deleteIndices(destinationIndex);
      });

      it('should schedule the transform by transformId', async () => {
        const reqBody: ScheduleNowTransformsRequestSchema = [{ id: transformId }];
        const { body, status } = await supertest
          .post(`/internal/transform/schedule_now_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(getCommonRequestHeader('1'))
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);

        expect(body[transformId].success).to.eql(true);
        expect(typeof body[transformId].error).to.eql('undefined');
      });

      it('should return 200 with success:false for unauthorized user', async () => {
        const reqBody: ScheduleNowTransformsRequestSchema = [{ id: transformId }];
        const { body, status } = await supertest
          .post(`/internal/transform/schedule_now_transforms`)
          .auth(
            USER.TRANSFORM_VIEWER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
          )
          .set(getCommonRequestHeader('1'))
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);

        expect(body[transformId].success).to.eql(false);
        expect(typeof body[transformId].error).to.eql('object');
      });
    });

    describe('single transform schedule with invalid transformId', function () {
      it('should return 200 with error in response if invalid transformId', async () => {
        const reqBody: ScheduleNowTransformsRequestSchema = [{ id: 'invalid_transform_id' }];
        const { body, status } = await supertest
          .post(`/internal/transform/schedule_now_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(getCommonRequestHeader('1'))
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);

        expect(body.invalid_transform_id.success).to.eql(false);
        expect(body.invalid_transform_id).to.have.property('error');
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/180496
    describe.skip('bulk schedule', function () {
      const reqBody: ScheduleNowTransformsRequestSchema = [
        { id: 'bulk_schedule_now_test_1' },
        { id: 'bulk_schedule_now_test_2' },
      ];
      const destinationIndices = reqBody.map((d) => generateDestIndex(d.id));

      beforeEach(async () => {
        await asyncForEach(reqBody, async ({ id }: { id: string }, idx: number) => {
          await createTransform(id);
          await transform.api.startTransform(id);
        });
      });

      afterEach(async () => {
        await asyncForEach(reqBody, async ({ id }: { id: string }, idx: number) => {
          await transform.api.stopTransform(id);
        });
        await transform.api.cleanTransformIndices();
        await asyncForEach(destinationIndices, async (destinationIndex: string) => {
          await transform.api.deleteIndices(destinationIndex);
        });
      });

      it('should schedule multiple transforms by transformIds', async () => {
        const { body, status } = await supertest
          .post(`/internal/transform/schedule_now_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(getCommonRequestHeader('1'))
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);

        await asyncForEach(reqBody, async ({ id: transformId }: { id: string }, idx: number) => {
          expect(body[transformId].success).to.eql(true);
        });
      });

      it('should schedule multiple transforms by transformIds, even if one of the transformIds is invalid', async () => {
        const invalidTransformId = 'invalid_transform_id';
        const { body, status } = await supertest
          .post(`/internal/transform/schedule_now_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(getCommonRequestHeader('1'))
          .send([{ id: reqBody[0].id }, { id: invalidTransformId }, { id: reqBody[1].id }]);
        transform.api.assertResponseStatusCode(200, status, body);

        await asyncForEach(reqBody, async ({ id: transformId }: { id: string }, idx: number) => {
          expect(body[transformId].success).to.eql(true);
        });

        expect(body[invalidTransformId].success).to.eql(false);
        expect(body[invalidTransformId]).to.have.property('error');
      });
    });
  });
};

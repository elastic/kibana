/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { ResetTransformsRequestSchema } from '@kbn/transform-plugin/common/api_schemas/reset_transforms';
import { TRANSFORM_STATE } from '@kbn/transform-plugin/common/constants';

import { COMMON_REQUEST_HEADERS } from '../../../functional/services/ml/common_api';
import { USER } from '../../../functional/services/transform/security_common';

import { FtrProviderContext } from '../../ftr_provider_context';

import { asyncForEach, generateTransformConfig } from './common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const transform = getService('transform');

  const expected = {
    complete: {
      state: 'stopped',
      pagesProcessed: 2,
      lastCheckpoint: 1,
    },
    reset: {
      state: 'stopped',
      pagesProcessed: 0,
      lastCheckpoint: 0,
    },
  };

  describe('/api/transform/reset_transforms', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await transform.api.cleanTransformIndices();
    });

    describe('single transform reset', function () {
      const transformId = 'transform-test-reset';

      beforeEach(async () => {
        await transform.api.createAndRunTransform(
          transformId,
          generateTransformConfig(transformId)
        );
        await transform.api.waitForBatchTransformToComplete(transformId);
      });

      afterEach(async () => {
        await transform.api.cleanTransformIndices();
      });

      it('should reset transform by transformId', async () => {
        // Check that batch transform finished running and assert stats.
        const completeStats = await transform.api.getTransformStats(transformId);
        expect(completeStats.state).to.eql(expected.complete.state);
        expect(completeStats.stats.pages_processed).to.eql(expected.complete.pagesProcessed);
        expect(completeStats.checkpointing.last.checkpoint).to.eql(
          expected.complete.lastCheckpoint
        );

        const reqBody: ResetTransformsRequestSchema = {
          transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
        };
        const { body, status } = await supertest
          .post(`/api/transform/reset_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);

        // Check that transform was reset and assert stats.
        expect(body[transformId].transformReset.success).to.eql(true);
        const resetStats = await transform.api.getTransformStats(transformId);
        expect(resetStats.state).to.eql(expected.reset.state);
        expect(resetStats.stats.pages_processed).to.eql(expected.reset.pagesProcessed);
        expect(resetStats.checkpointing.last.checkpoint).to.eql(expected.reset.lastCheckpoint);
      });

      it('should return 403 for unauthorized user', async () => {
        // Check that batch transform finished running and assert stats.
        const completeStats = await transform.api.getTransformStats(transformId);
        expect(completeStats.state).to.eql(expected.complete.state);
        expect(completeStats.stats.pages_processed).to.eql(expected.complete.pagesProcessed);
        expect(completeStats.checkpointing.last.checkpoint).to.eql(
          expected.complete.lastCheckpoint
        );

        const reqBody: ResetTransformsRequestSchema = {
          transformsInfo: [{ id: transformId, state: TRANSFORM_STATE.STOPPED }],
        };
        const { body, status } = await supertest
          .post(`/api/transform/reset_transforms`)
          .auth(
            USER.TRANSFORM_VIEWER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send(reqBody);
        transform.api.assertResponseStatusCode(403, status, body);

        await transform.api.waitForTransformToExist(transformId);
        // Check that transform was not reset by asserting unchanged stats.
        const resetStats = await transform.api.getTransformStats(transformId);
        expect(resetStats.state).to.eql(expected.complete.state);
        expect(resetStats.stats.pages_processed).to.eql(expected.complete.pagesProcessed);
        expect(resetStats.checkpointing.last.checkpoint).to.eql(expected.complete.lastCheckpoint);
      });
    });

    describe('single transform reset with invalid transformId', function () {
      it('should return 200 with error in response if invalid transformId', async () => {
        const reqBody: ResetTransformsRequestSchema = {
          transformsInfo: [{ id: 'invalid_transform_id', state: TRANSFORM_STATE.STOPPED }],
        };
        const { body, status } = await supertest
          .post(`/api/transform/reset_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);

        expect(body.invalid_transform_id.transformReset.success).to.eql(false);
        expect(body.invalid_transform_id.transformReset).to.have.property('error');
      });
    });

    describe('bulk reset', function () {
      const reqBody: ResetTransformsRequestSchema = {
        transformsInfo: [
          { id: 'bulk_reset_test_1', state: TRANSFORM_STATE.STOPPED },
          { id: 'bulk_reset_test_2', state: TRANSFORM_STATE.STOPPED },
        ],
      };

      beforeEach(async () => {
        await asyncForEach(reqBody.transformsInfo, async ({ id }: { id: string }, idx: number) => {
          await transform.api.createAndRunTransform(id, generateTransformConfig(id));
          await transform.api.waitForBatchTransformToComplete(id);
        });
      });

      afterEach(async () => {
        await transform.api.cleanTransformIndices();
      });

      it('should reset multiple transforms by transformIds', async () => {
        await asyncForEach(
          reqBody.transformsInfo,
          async ({ id: transformId }: { id: string }, idx: number) => {
            // Check that batch transform finished running and assert stats.
            const completeStats = await transform.api.getTransformStats(transformId);
            expect(completeStats.state).to.eql(expected.complete.state);
            expect(completeStats.stats.pages_processed).to.eql(expected.complete.pagesProcessed);
            expect(completeStats.checkpointing.last.checkpoint).to.eql(
              expected.complete.lastCheckpoint
            );
          }
        );

        const { body, status } = await supertest
          .post(`/api/transform/reset_transforms`)
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
            await transform.api.waitForTransformToExist(transformId);
            // Check that transform was reset and assert stats.
            expect(body[transformId].transformReset.success).to.eql(true);
            const resetStats = await transform.api.getTransformStats(transformId);
            expect(resetStats.state).to.eql(expected.reset.state);
            expect(resetStats.stats.pages_processed).to.eql(expected.reset.pagesProcessed);
            expect(resetStats.checkpointing.last.checkpoint).to.eql(expected.reset.lastCheckpoint);
          }
        );
      });

      it('should reset multiple transforms by transformIds, even if one of the transformIds is invalid', async () => {
        await asyncForEach(
          reqBody.transformsInfo,
          async ({ id: transformId }: { id: string }, idx: number) => {
            // Check that batch transform finished running and assert stats.
            const completeStats = await transform.api.getTransformStats(transformId);
            expect(completeStats.state).to.eql(expected.complete.state);
            expect(completeStats.stats.pages_processed).to.eql(expected.complete.pagesProcessed);
            expect(completeStats.checkpointing.last.checkpoint).to.eql(
              expected.complete.lastCheckpoint
            );
          }
        );

        const invalidTransformId = 'invalid_transform_id';
        const { body, status } = await supertest
          .post(`/api/transform/reset_transforms`)
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
            if (transformId !== invalidTransformId) {
              await transform.api.waitForTransformToExist(transformId);
              // Check that transform was reset and assert stats.
              expect(body[transformId].transformReset.success).to.eql(true);
              const resetStats = await transform.api.getTransformStats(transformId);
              expect(resetStats.state).to.eql(expected.reset.state);
              expect(resetStats.stats.pages_processed).to.eql(expected.reset.pagesProcessed);
              expect(resetStats.checkpointing.last.checkpoint).to.eql(
                expected.reset.lastCheckpoint
              );
            } else {
              expect(body[transformId].transformReset.success).to.eql(false);
              expect(body[transformId].transformReset).to.have.property('error');
            }
          }
        );
      });
    });
  });
};

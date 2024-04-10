/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReauthorizeTransformsRequestSchema } from '@kbn/transform-plugin/common/api_schemas/reauthorize_transforms';
import expect from '@kbn/expect';
import { TRANSFORM_STATE } from '@kbn/transform-plugin/common/constants';
import type { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/types';
import { getCommonRequestHeader } from '../../../functional/services/ml/common_api';
import { USER } from '../../../functional/services/transform/security_common';

import { FtrProviderContext } from '../../ftr_provider_context';

import { asyncForEach, generateDestIndex, generateTransformConfig } from './common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const transform = getService('transform');

  function getTransformIdByUser(username: USER) {
    return `transform-by-${username}`;
  }

  function generateHeaders(apiKey: SecurityCreateApiKeyResponse, version?: string) {
    return {
      ...getCommonRequestHeader(version),
      'es-secondary-authorization': `ApiKey ${apiKey.encoded}`,
    };
  }

  async function createTransform(transformId: string, headers: object) {
    const config = generateTransformConfig(transformId, true);
    await transform.api.createTransform(transformId, config, {
      headers,
      deferValidation: true,
    });
  }

  async function cleanUpTransform(transformId: string) {
    const destinationIndex = generateDestIndex(transformId);

    await transform.api.stopTransform(transformId);
    await transform.api.cleanTransformIndices();
    await transform.api.deleteIndices(destinationIndex);
  }

  // If transform was created with sufficient permissions -> should create and start
  // If transform was created with insufficient permissions -> should create but not start
  describe('/internal/transform/reauthorize_transforms', function () {
    const apiKeysForTransformUsers = new Map<USER, SecurityCreateApiKeyResponse>();

    async function expectUnauthorizedTransform(transformId: string, createdByUser: USER) {
      const user = createdByUser;
      const { body: getTransformBody } = await transform.api.getTransform(transformId);
      const transformInfo = getTransformBody.transforms[0];
      const expectedApiKeyId = apiKeysForTransformUsers?.get(user)?.id;

      expect(typeof transformInfo.authorization.api_key).to.be('object');
      expect(transformInfo.authorization.api_key.id).to.eql(
        expectedApiKeyId,
        `Expected authorization api_key for ${transformId} to be ${expectedApiKeyId} (got ${JSON.stringify(
          transformInfo.authorization.api_key
        )})`
      );

      const stats = await transform.api.getTransformStats(transformId);
      expect(stats.state).to.eql(
        TRANSFORM_STATE.STOPPED,
        `Expected transform state of ${transformId} to be '${TRANSFORM_STATE.STOPPED}' (got ${stats.state})`
      );
      expect(stats.health?.status).to.eql(
        'red',
        `Expected transform health status of ${transformId} to be 'red' (got ${stats.health?.status})`
      );
      expect(stats.health?.issues![0].type).to.eql(
        'privileges_check_failed',
        `Expected transform health issue of ${transformId} to be 'privileges_check_failed' (got ${stats.health?.status})`
      );
    }

    async function expectAuthorizedTransform(transformId: string, createdByUser: USER) {
      const { body: getTransformBody } = await transform.api.getTransform(transformId);
      const transformInfo = getTransformBody.transforms[0];

      const expectedApiKeyId = apiKeysForTransformUsers?.get(createdByUser)?.id;
      expect(transformInfo.authorization.api_key.id).to.not.eql(
        expectedApiKeyId,
        `Expected authorization api_key for ${transformId} to not be ${expectedApiKeyId} (got ${JSON.stringify(
          transformInfo.authorization.api_key
        )})`
      );
      const stats = await transform.api.getTransformStats(transformId);
      expect(stats.health?.status).to.eql(
        'green',
        `Expected transform health status of ${transformId} to be 'green' (got ${stats.health?.status})`
      );
    }

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();

      const apiKeyForTransformUsers =
        await transform.securityCommon.createApiKeyForTransformUsers();

      apiKeyForTransformUsers.forEach(({ user, apiKey }) =>
        apiKeysForTransformUsers.set(user.name as USER, apiKey)
      );
    });

    after(async () => {
      await transform.securityCommon.clearAllTransformApiKeys();
    });

    describe('single transform reauthorize_transforms', function () {
      const transformCreatedByViewerId = getTransformIdByUser(USER.TRANSFORM_VIEWER);

      beforeEach(async () => {
        await createTransform(
          transformCreatedByViewerId,
          generateHeaders(apiKeysForTransformUsers.get(USER.TRANSFORM_VIEWER)!, '1')
        );
      });
      afterEach(async () => {
        await cleanUpTransform(transformCreatedByViewerId);
      });

      it('should not reauthorize transform created by transform_viewer for transform_unauthorized', async () => {
        const reqBody: ReauthorizeTransformsRequestSchema = [{ id: transformCreatedByViewerId }];
        const { body, status } = await supertest
          .post(`/internal/transform/reauthorize_transforms`)
          .auth(
            USER.TRANSFORM_UNAUTHORIZED,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_UNAUTHORIZED)
          )
          .set(getCommonRequestHeader('1'))
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);
        expect(body[transformCreatedByViewerId].success).to.eql(
          false,
          `Expected ${transformCreatedByViewerId} not to be authorized`
        );
        expect(typeof body[transformCreatedByViewerId].error).to.be('object');

        await expectUnauthorizedTransform(transformCreatedByViewerId, USER.TRANSFORM_VIEWER);
      });

      it('should not reauthorize transform created by transform_viewer for transform_viewer', async () => {
        const reqBody: ReauthorizeTransformsRequestSchema = [{ id: transformCreatedByViewerId }];
        const { body, status } = await supertest
          .post(`/internal/transform/reauthorize_transforms`)
          .auth(
            USER.TRANSFORM_VIEWER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
          )
          .set(getCommonRequestHeader('1'))
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);
        expect(body[transformCreatedByViewerId].success).to.eql(
          false,
          `Expected ${transformCreatedByViewerId} not to be rauthorized`
        );
        expect(typeof body[transformCreatedByViewerId].error).to.be('object');

        await expectUnauthorizedTransform(transformCreatedByViewerId, USER.TRANSFORM_VIEWER);
      });

      it('should reauthorize transform created by transform_viewer with new api key of poweruser and start the transform', async () => {
        const reqBody: ReauthorizeTransformsRequestSchema = [{ id: transformCreatedByViewerId }];
        const { body, status } = await supertest
          .post(`/internal/transform/reauthorize_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(getCommonRequestHeader('1'))
          .send(reqBody);
        transform.api.assertResponseStatusCode(200, status, body);
        expect(body[transformCreatedByViewerId].success).to.eql(
          true,
          `Expected ${transformCreatedByViewerId} to be reauthorized`
        );
        expect(typeof body[transformCreatedByViewerId].error).to.eql(
          'undefined',
          `Expected ${transformCreatedByViewerId} to be reauthorized without error`
        );
        await transform.api.waitForTransformState(
          transformCreatedByViewerId,
          TRANSFORM_STATE.STARTED
        );

        await expectAuthorizedTransform(transformCreatedByViewerId, USER.TRANSFORM_VIEWER);
      });
    });

    describe('single transform reauthorize_transforms with invalid transformId', function () {
      it('should return 200 with error in response if invalid transformId', async () => {
        const reqBody: ReauthorizeTransformsRequestSchema = [{ id: 'invalid_transform_id' }];
        const { body, status } = await supertest
          .post(`/internal/transform/reauthorize_transforms`)
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

    describe('bulk reauthorize_transforms', function () {
      const reqBody: ReauthorizeTransformsRequestSchema = [
        USER.TRANSFORM_VIEWER,
        USER.TRANSFORM_POWERUSER,
      ].map((user) => ({ id: getTransformIdByUser(user) }));
      const destinationIndices = reqBody.map((d) => generateDestIndex(d.id));

      beforeEach(async () => {
        await Promise.all(
          [USER.TRANSFORM_VIEWER, USER.TRANSFORM_POWERUSER].map((user) =>
            createTransform(
              getTransformIdByUser(user),
              generateHeaders(apiKeysForTransformUsers.get(user)!, '1')
            )
          )
        );
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

      it('should reauthorize multiple transforms for transform_poweruser, even if one of the transformIds is invalid', async () => {
        const invalidTransformId = 'invalid_transform_id';

        const { body, status } = await supertest
          .post(`/internal/transform/reauthorize_transforms`)
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(getCommonRequestHeader('1'))
          .send([...reqBody, { id: invalidTransformId }]);
        transform.api.assertResponseStatusCode(200, status, body);

        await expectAuthorizedTransform(
          getTransformIdByUser(USER.TRANSFORM_VIEWER),
          USER.TRANSFORM_VIEWER
        );
        await expectAuthorizedTransform(
          getTransformIdByUser(USER.TRANSFORM_POWERUSER),
          USER.TRANSFORM_POWERUSER
        );

        expect(body[invalidTransformId].success).to.eql(false);
        expect(body[invalidTransformId]).to.have.property('error');
      });
    });
  });
};

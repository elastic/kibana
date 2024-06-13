/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SavedObjectWithMetadata } from '@kbn/saved-objects-management-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');
  let roleAuthc: RoleCredentials;

  const URL = '/api/kibana/management/saved_objects/_bulk_get';
  const validObject = { type: 'visualization', id: 'dd7caf20-9efd-11e7-acb3-3dab96693fab' };
  const invalidObject = { type: 'wigwags', id: 'foo' };

  describe('_bulk_get', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
    });

    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });

    describe('get objects in bulk', () => {
      before(() =>
        kibanaServer.importExport.load(
          'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
        )
      );
      after(() =>
        kibanaServer.importExport.unload(
          'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
        )
      );

      function expectSuccess(index: number, objs: SavedObjectWithMetadata[]) {
        const { type, id, meta, error } = objs[index];
        expect(type).to.eql(validObject.type);
        expect(id).to.eql(validObject.id);
        expect(meta).to.not.equal(undefined);
        expect(error).to.equal(undefined);
      }

      function expectBadRequest(index: number, objs: SavedObjectWithMetadata[]) {
        const { type, id, error } = objs[index];
        expect(type).to.eql(invalidObject.type);
        expect(id).to.eql(invalidObject.id);
        expect(error).to.eql({
          message: `Unsupported saved object type: '${invalidObject.type}': Bad Request`,
          statusCode: 400,
          error: 'Bad Request',
        });
      }

      it('should return 200 for object that exists and inject metadata', async () =>
        await supertestWithoutAuth
          .post(URL)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send([validObject])
          .expect(200)
          .then(({ body }) => {
            expect(body).to.have.length(1);
            expectSuccess(0, body);
          }));

      it('should return error for invalid object type', async () =>
        await supertestWithoutAuth
          .post(URL)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send([invalidObject])
          .expect(200)
          .then(({ body }) => {
            expect(body).to.have.length(1);
            expectBadRequest(0, body);
          }));

      it('should return mix of successes and errors', async () =>
        await supertestWithoutAuth
          .post(URL)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send([validObject, invalidObject])
          .expect(200)
          .then(({ body }) => {
            expect(body).to.have.length(2);
            expectSuccess(0, body);
            expectBadRequest(1, body);
          }));
    });
  });
}

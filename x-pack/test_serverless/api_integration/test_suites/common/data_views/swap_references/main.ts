/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  DATA_VIEW_SWAP_REFERENCES_PATH,
  SPECIFIC_DATA_VIEW_PATH,
  DATA_VIEW_PATH,
} from '@kbn/data-views-plugin/server';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIAL_REST_VERSION } from '@kbn/data-views-plugin/server/constants';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { InternalRequestHeader, RoleCredentials } from '../../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;
  const title = 'logs-*';
  const prevDataViewId = '91200a00-9efd-11e7-acb3-3dab96693fab';
  const PREVIEW_PATH = `${DATA_VIEW_SWAP_REFERENCES_PATH}/_preview`;
  let dataViewId = '';

  describe('main', () => {
    const kibanaServer = getService('kibanaServer');
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      const result = await supertestWithoutAuth
        .post(DATA_VIEW_PATH)
        .send({ data_view: { title } })
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader);
      dataViewId = result.body.data_view.id;
    });
    after(async () => {
      await supertestWithoutAuth
        .delete(SPECIFIC_DATA_VIEW_PATH.replace('{id}', dataViewId))
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader);
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });
    beforeEach(async () => {
      await kibanaServer.importExport.load(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      );
    });
    afterEach(async () => {
      await kibanaServer.importExport.unload(
        'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
      );
    });

    it('can preview', async () => {
      const res = await supertestWithoutAuth
        .post(PREVIEW_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .send({
          fromId: prevDataViewId,
          toId: dataViewId,
        });
      expect(res).to.have.property('status', 200);
    });

    it('can preview specifying type', async () => {
      const res = await supertestWithoutAuth
        .post(PREVIEW_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .send({
          fromId: prevDataViewId,
          fromType: 'index-pattern',
          toId: dataViewId,
        });
      expect(res).to.have.property('status', 200);
    });

    it('can save changes', async () => {
      const res = await supertestWithoutAuth
        .post(DATA_VIEW_SWAP_REFERENCES_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .send({
          fromId: prevDataViewId,
          toId: dataViewId,
        });
      expect(res).to.have.property('status', 200);
      expect(res.body.result.length).to.equal(1);
      expect(res.body.result[0].id).to.equal('dd7caf20-9efd-11e7-acb3-3dab96693fab');
      expect(res.body.result[0].type).to.equal('visualization');
    });

    it('can save changes and remove old saved object', async () => {
      const res = await supertestWithoutAuth
        .post(DATA_VIEW_SWAP_REFERENCES_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .send({
          fromId: prevDataViewId,
          toId: dataViewId,
          delete: true,
        });
      expect(res).to.have.property('status', 200);
      expect(res.body.result.length).to.equal(1);
      expect(res.body.deleteStatus.remainingRefs).to.equal(0);
      expect(res.body.deleteStatus.deletePerformed).to.equal(true);

      const res2 = await supertestWithoutAuth
        .get(SPECIFIC_DATA_VIEW_PATH.replace('{id}', prevDataViewId))
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader);

      expect(res2).to.have.property('statusCode', 404);
    });

    describe('limit affected saved objects', () => {
      beforeEach(async () => {
        await kibanaServer.importExport.load(
          'test/api_integration/fixtures/kbn_archiver/management/saved_objects/relationships.json'
        );
      });
      afterEach(async () => {
        await kibanaServer.importExport.unload(
          'test/api_integration/fixtures/kbn_archiver/management/saved_objects/relationships.json'
        );
      });

      it("won't delete if reference remains", async () => {
        const res = await supertestWithoutAuth
          .post(DATA_VIEW_SWAP_REFERENCES_PATH)
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader)
          .send({
            fromId: '8963ca30-3224-11e8-a572-ffca06da1357',
            toId: '91200a00-9efd-11e7-acb3-3dab96693fab',
            forId: ['960372e0-3224-11e8-a572-ffca06da1357'],
            delete: true,
          });
        expect(res).to.have.property('status', 200);
        expect(res.body.result.length).to.equal(1);
        expect(res.body.deleteStatus.remainingRefs).to.equal(1);
        expect(res.body.deleteStatus.deletePerformed).to.equal(false);
      });

      it('can limit by id', async () => {
        // confirm this will find two items
        const res = await supertestWithoutAuth
          .post(PREVIEW_PATH)
          .send({
            fromId: '8963ca30-3224-11e8-a572-ffca06da1357',
            toId: '91200a00-9efd-11e7-acb3-3dab96693fab',
          })
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader);
        expect(res).to.have.property('status', 200);
        expect(res.body.result.length).to.equal(2);

        // limit to one item
        const res2 = await supertestWithoutAuth
          .post(DATA_VIEW_SWAP_REFERENCES_PATH)
          .send({
            fromId: '8963ca30-3224-11e8-a572-ffca06da1357',
            toId: '91200a00-9efd-11e7-acb3-3dab96693fab',
            forId: ['960372e0-3224-11e8-a572-ffca06da1357'],
          })
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader);
        expect(res2).to.have.property('status', 200);
        expect(res2.body.result.length).to.equal(1);
      });

      it('can limit by type', async () => {
        // confirm this will find two items
        const res = await supertestWithoutAuth
          .post(PREVIEW_PATH)
          .send({
            fromId: '8963ca30-3224-11e8-a572-ffca06da1357',
            toId: '91200a00-9efd-11e7-acb3-3dab96693fab',
          })
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader);
        expect(res).to.have.property('status', 200);
        expect(res.body.result.length).to.equal(2);

        // limit to one item
        const res2 = await supertestWithoutAuth
          .post(DATA_VIEW_SWAP_REFERENCES_PATH)
          .send({
            fromId: '8963ca30-3224-11e8-a572-ffca06da1357',
            toId: '91200a00-9efd-11e7-acb3-3dab96693fab',
            forType: 'search',
          })
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader);
        expect(res2).to.have.property('status', 200);
        expect(res2.body.result.length).to.equal(1);
      });
    });
  });
}

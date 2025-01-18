/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

const apiUrl = '/api/kibana/management/saved_objects/scroll/counts';
const defaultTypes = ['visualization', 'index-pattern', 'search', 'dashboard'];

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');
  let roleAuthc: RoleCredentials;

  describe('scroll_count', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });
    describe('scroll_count with more than 10k objects', () => {
      const importVisualizations = async ({
        startIdx = 1,
        endIdx,
      }: {
        startIdx?: number;
        endIdx: number;
      }) => {
        const fileChunks: string[] = [];
        for (let i = startIdx; i <= endIdx; i++) {
          const id = `test-vis-${i}`;
          fileChunks.push(
            JSON.stringify({
              type: 'visualization',
              id,
              attributes: {
                title: `My visualization (${i})`,
                uiStateJSON: '{}',
                visState: '{}',
              },
              references: [],
            })
          );
        }

        await supertestWithoutAuth
          .post(`/api/saved_objects/_import`)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .attach('file', Buffer.from(fileChunks.join('\n'), 'utf8'), 'export.ndjson')
          .expect(200);
      };

      const deleteVisualizations = async ({
        startIdx = 1,
        endIdx,
      }: {
        startIdx?: number;
        endIdx: number;
      }) => {
        const objsToDelete: any[] = [];
        for (let i = startIdx; i <= endIdx; i++) {
          const id = `test-vis-${i}`;
          objsToDelete.push({ type: 'visualization', id });
        }
        await kibanaServer.savedObjects.bulkDelete({ objects: objsToDelete });
      };

      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await importVisualizations({ startIdx: 1, endIdx: 6000 });
        await importVisualizations({ startIdx: 6001, endIdx: 12000 });
      });

      after(async () => {
        // kibanaServer.savedObjects.cleanStandardList({}); times out for 12000 items
        await deleteVisualizations({ startIdx: 1, endIdx: 3000 });
        await deleteVisualizations({ startIdx: 3001, endIdx: 6000 });
        await deleteVisualizations({ startIdx: 6001, endIdx: 9000 });
        await deleteVisualizations({ startIdx: 9001, endIdx: 12000 });
      });

      it('returns the correct count for each included types', async () => {
        const { body } = await supertestWithoutAuth
          .post(apiUrl)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send({
            typesToInclude: ['visualization'],
          })
          .expect(200);

        expect(body).to.eql({
          visualization: 12000,
        });
      });
    });
    describe('with less than 10k objects', () => {
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await kibanaServer.importExport.load(
          'test/api_integration/fixtures/kbn_archiver/saved_objects/scroll_count.json'
        );
      });
      after(async () => {
        await kibanaServer.importExport.unload(
          'test/api_integration/fixtures/kbn_archiver/saved_objects/scroll_count.json'
        );
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it('returns the count for each included types', async () => {
        const { body } = await supertestWithoutAuth
          .post(apiUrl)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send({
            typesToInclude: defaultTypes,
          })
          .expect(200);

        expect(body).to.eql({
          dashboard: 2,
          'index-pattern': 1,
          search: 1,
          visualization: 2,
        });
      });

      it('only returns count for types to include', async () => {
        const { body } = await supertestWithoutAuth
          .post(apiUrl)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send({
            typesToInclude: ['dashboard', 'search'],
          })
          .expect(200);

        expect(body).to.eql({
          dashboard: 2,
          search: 1,
        });
      });

      it('filters on title when `searchString` is provided', async () => {
        const { body } = await supertestWithoutAuth
          .post(apiUrl)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send({
            typesToInclude: defaultTypes,
            searchString: 'Amazing',
          })
          .expect(200);

        expect(body).to.eql({
          dashboard: 1,
          visualization: 1,
          'index-pattern': 0,
          search: 0,
        });
      });

      it('includes all requested types even when none match the search', async () => {
        const { body } = await supertestWithoutAuth
          .post(apiUrl)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .send({
            typesToInclude: ['dashboard', 'search', 'visualization'],
            searchString: 'nothing-will-match',
          })
          .expect(200);

        expect(body).to.eql({
          dashboard: 0,
          visualization: 0,
          search: 0,
        });
      });
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  const IMPORTER_ROLE_NAME = 'importer';
  const IMPORTER_USER_NAME = 'importer';
  const IMPORT_USER_PASSWORD = `${IMPORTER_USER_NAME}-password`;
  const INDEX_NAME = 'myNewIndex';

  describe('GET /internal/file_upload/has_import_permission', () => {
    it('should return true when user has all permissions', async () => {
      try {
        await security.role.create(IMPORTER_ROLE_NAME, {
          elasticsearch: {
            cluster: ['manage_pipeline'],
            indices: [
              {
                names: [INDEX_NAME],
                privileges: ['create', 'create_index'],
              },
            ],
          },
          kibana: [
            {
              feature: {
                indexPatterns: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create(IMPORTER_USER_NAME, {
          password: IMPORT_USER_PASSWORD,
          roles: [IMPORTER_ROLE_NAME],
        });

        const resp = await supertestWithoutAuth
          .get(
            `/internal/file_upload/has_import_permission\
?checkCreateDataView=true\
&checkHasManagePipeline=true\
&indexName=${INDEX_NAME}`
          )
          .auth(IMPORTER_USER_NAME, IMPORT_USER_PASSWORD)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        expect(resp.body.hasImportPermission).to.be(true);
      } finally {
        await security.role.delete(IMPORTER_ROLE_NAME);
        await security.user.delete(IMPORTER_USER_NAME);
      }
    });

    it('should return false when user can not create data view when checkCreateDataView=true', async () => {
      try {
        await security.role.create(IMPORTER_ROLE_NAME, {});

        await security.user.create(IMPORTER_USER_NAME, {
          password: IMPORT_USER_PASSWORD,
          roles: [IMPORTER_ROLE_NAME],
        });

        const resp = await supertestWithoutAuth
          .get(
            `/internal/file_upload/has_import_permission\
?checkCreateDataView=true\
&checkHasManagePipeline=false`
          )
          .auth(IMPORTER_USER_NAME, IMPORT_USER_PASSWORD)
          .set('kbn-xsrf', 'kibana')
          .send()
          .expect(200);

        expect(resp.body.hasImportPermission).to.be(false);
      } finally {
        await security.role.delete(IMPORTER_ROLE_NAME);
        await security.user.delete(IMPORTER_USER_NAME);
      }
    });

    it('should return false when user can not create pipeline when checkHasManagePipeline=true', async () => {
      try {
        await security.role.create(IMPORTER_ROLE_NAME, {});

        await security.user.create(IMPORTER_USER_NAME, {
          password: IMPORT_USER_PASSWORD,
          roles: [IMPORTER_ROLE_NAME],
        });

        const resp = await supertestWithoutAuth
          .get(
            `/internal/file_upload/has_import_permission\
?checkCreateDataView=false\
&checkHasManagePipeline=true`
          )
          .auth(IMPORTER_USER_NAME, IMPORT_USER_PASSWORD)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        expect(resp.body.hasImportPermission).to.be(false);
      } finally {
        await security.role.delete(IMPORTER_ROLE_NAME);
        await security.user.delete(IMPORTER_USER_NAME);
      }
    });

    it('should return false when user does not have index permissions', async () => {
      try {
        await security.role.create(IMPORTER_ROLE_NAME, {});

        await security.user.create(IMPORTER_USER_NAME, {
          password: IMPORT_USER_PASSWORD,
          roles: [IMPORTER_ROLE_NAME],
        });

        const resp = await supertestWithoutAuth
          .get(
            `/internal/file_upload/has_import_permission\
?checkCreateDataView=false\
&checkHasManagePipeline=false\
&indexName=${INDEX_NAME}`
          )
          .auth(IMPORTER_USER_NAME, IMPORT_USER_PASSWORD)
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        expect(resp.body.hasImportPermission).to.be(false);
      } finally {
        await security.role.delete(IMPORTER_ROLE_NAME);
        await security.user.delete(IMPORTER_USER_NAME);
      }
    });
  });
};

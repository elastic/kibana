/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const reportingAPI = getService('svlReportingApi');
  const svlCommonApi = getService('svlCommonApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlUserManager = getService('svlUserManager');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  const archives: Record<string, { data: string; savedObjects: string }> = {
    ecommerce: {
      data: 'x-pack/test/functional/es_archives/reporting/ecommerce',
      savedObjects: 'x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce',
    },
  };

  describe('Data Stream', function () {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();

      await esArchiver.load(archives.ecommerce.data);
      await kibanaServer.importExport.load(archives.ecommerce.savedObjects);

      // for this test, we don't need to wait for the job to finish or verify the result
      await reportingAPI.createReportJobInternal(
        'csv_searchsource',
        {
          browserTimezone: 'UTC',
          objectType: 'search',
          searchSource: {
            index: '5193f870-d861-11e9-a311-0fa548c5f953',
            query: { language: 'kuery', query: '' },
            version: true,
          },
          title: 'Ecommerce Data',
          version: '8.15.0',
        },
        roleAuthc,
        internalReqHeader
      );
    });

    after(async () => {
      await reportingAPI.deleteAllReports(roleAuthc, internalReqHeader);
      await esArchiver.unload(archives.ecommerce.data);
      await kibanaServer.importExport.unload(archives.ecommerce.savedObjects);
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('uses the datastream configuration', async () => {
      const { status, body } = await supertestWithoutAuth
        .get(`/api/index_management/data_streams/.kibana-reporting`)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader);

      svlCommonApi.assertResponseStatusCode(200, status, body);

      expect(body).toEqual(
        expect.objectContaining({
          _meta: {
            description: 'default kibana reporting template installed by elasticsearch',
            managed: true,
          },
          name: '.kibana-reporting',
          indexTemplateName: '.kibana-reporting',
          generation: 1,
          health: 'green',
          hidden: true,
          indices: [
            {
              name: expect.any(String),
              uuid: expect.any(String),
              managedBy: 'Data stream lifecycle',
              preferILM: true,
            },
          ],
          lifecycle: expect.objectContaining({ enabled: true }),
          nextGenerationManagedBy: 'Data stream lifecycle',
          privileges: { delete_index: true, manage_data_stream_lifecycle: true },
          timeStampField: { name: '@timestamp' },
        })
      );
    });
  });
}

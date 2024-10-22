/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SupertestWithRoleScope } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services/role_scoped_supertest';
import { DataStreamsResponseBodySchemaBody } from '@kbn/data-usage-plugin/common/rest_types';
import { FtrProviderContext } from '../../../../ftr_provider_context';

const API_PATH = '/internal/api/data_usage/data_streams';
export default function ({ getService }: FtrProviderContext) {
  const svlDatastreamsHelpers = getService('svlDatastreamsHelpers');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestAdminWithCookieCredentials: SupertestWithRoleScope;
  const testDataStreamName = 'test-data-stream';
  describe(`GET ${API_PATH}`, function () {
    before(async () => {
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );
    });

    it('returns created data streams', async () => {
      await svlDatastreamsHelpers.createDataStream(testDataStreamName);

      const res = await supertestAdminWithCookieCredentials
        .get(API_PATH)
        .set('elastic-api-version', '1');
      const dataStreams: DataStreamsResponseBodySchemaBody = res.body;
      const foundStream = dataStreams.find((stream) => stream.name === testDataStreamName);
      expect(foundStream?.name).to.be(testDataStreamName);
      expect(foundStream?.storageSizeBytes).to.be(0);
      expect(res.statusCode).to.be(200);
      await svlDatastreamsHelpers.deleteDataStream(testDataStreamName);
    });
    it('returns system indices', async () => {
      const res = await supertestAdminWithCookieCredentials
        .get(API_PATH)
        .set('elastic-api-version', '1');
      const dataStreams: DataStreamsResponseBodySchemaBody = res.body;
      const systemDataStreams = dataStreams.filter((stream) => stream.name.startsWith('.'));
      expect(systemDataStreams.length).to.be.greaterThan(0);
      expect(res.statusCode).to.be(200);
    });
  });
}

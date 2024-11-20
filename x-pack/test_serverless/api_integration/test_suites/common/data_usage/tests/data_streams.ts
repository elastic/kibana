/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SupertestWithRoleScope } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services/role_scoped_supertest';
import { DataStreamsResponseBodySchemaBody } from '@kbn/data-usage-plugin/common/rest_types';
import { DATA_USAGE_DATA_STREAMS_API_ROUTE } from '@kbn/data-usage-plugin/common';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlDatastreamsHelpers = getService('svlDatastreamsHelpers');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestAdminWithCookieCredentials: SupertestWithRoleScope;
  const testDataStreamName = 'test-data-stream';
  describe(`GET ${DATA_USAGE_DATA_STREAMS_API_ROUTE}`, function () {
    // due to the plugin depending on yml config (xpack.dataUsage.enabled), we cannot test in MKI until it is on by default
    this.tags(['skipMKI']);
    before(async () => {
      await svlDatastreamsHelpers.createDataStream(testDataStreamName);
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );
    });
    after(async () => {
      await svlDatastreamsHelpers.deleteDataStream(testDataStreamName);
    });

    it('returns created data streams', async () => {
      const res = await supertestAdminWithCookieCredentials
        .get(DATA_USAGE_DATA_STREAMS_API_ROUTE)
        .set('elastic-api-version', '1');
      const dataStreams: DataStreamsResponseBodySchemaBody = res.body;
      const foundStream = dataStreams.find((stream) => stream.name === testDataStreamName);
      expect(foundStream?.name).to.be(testDataStreamName);
      expect(foundStream?.storageSizeBytes).to.be(0);
      expect(res.statusCode).to.be(200);
    });
    it('returns system indices', async () => {
      const res = await supertestAdminWithCookieCredentials
        .get(DATA_USAGE_DATA_STREAMS_API_ROUTE)
        .set('elastic-api-version', '1');
      const dataStreams: DataStreamsResponseBodySchemaBody = res.body;
      const systemDataStreams = dataStreams.filter((stream) => stream.name.startsWith('.'));
      expect(systemDataStreams.length).to.be.greaterThan(0);
      expect(res.statusCode).to.be(200);
    });
  });
}

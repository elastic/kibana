/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DataStreamsResponseBodySchemaBody } from '@kbn/data-usage-plugin/common/rest_types';
import { DATA_USAGE_DATA_STREAMS_API_ROUTE } from '@kbn/data-usage-plugin/common';
import { SupertestWithRoleScope } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/services/role_scoped_supertest';
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

    // skipped because we filter out data streams with 0 storage size,
    // and metering api does not pick up indexed data here
    // TODO: route should potentially not depend solely on metering API
    it.skip('returns created data streams', async () => {
      const res = await supertestAdminWithCookieCredentials
        .get(DATA_USAGE_DATA_STREAMS_API_ROUTE)
        .set('elastic-api-version', '1');
      const dataStreams: DataStreamsResponseBodySchemaBody = res.body;
      const foundStream = dataStreams.find((stream) => stream.name === testDataStreamName);
      expect(foundStream?.name).to.be(testDataStreamName);
      expect(foundStream?.storageSizeBytes).to.be(0);
      expect(res.statusCode).to.be(200);
    });
  });
}

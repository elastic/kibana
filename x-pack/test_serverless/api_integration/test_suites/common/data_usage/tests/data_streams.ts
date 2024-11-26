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
  const es = getService('es');
  const retry = getService('retry');
  let supertestAdminWithCookieCredentials: SupertestWithRoleScope;
  const testDataStreamName = 'test-data-stream';
  describe(`GET ${DATA_USAGE_DATA_STREAMS_API_ROUTE}`, function () {
    before(async () => {
      await svlDatastreamsHelpers.createDataStream(testDataStreamName);
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );
      // index some data into the data stream to prevent from api filtering it out
      await es.bulk({
        refresh: true,
        body: [
          { create: { _index: testDataStreamName } },
          {
            '@timestamp': new Date().toISOString(),
            field1: `bulk-doc-1}`,
            field2: 1,
          },
        ],
      });
    });
    after(async () => {
      await svlDatastreamsHelpers.deleteDataStream(testDataStreamName);
    });

    it('returns created data streams', async () => {
      // can take some time for metering api to update with storage size and do ccount
      await retry.tryForTime(60000, async () => {
        const res = await supertestAdminWithCookieCredentials
          .get(DATA_USAGE_DATA_STREAMS_API_ROUTE)
          .set('elastic-api-version', '1');

        const dataStreams: DataStreamsResponseBodySchemaBody = res.body;

        const foundStream = dataStreams.find((stream) => stream.name === testDataStreamName);
        if (!foundStream || foundStream.storageSizeBytes <= 0) {
          throw new Error(
            `Data stream "${testDataStreamName}" not found or has zero storage size. Retrying...`
          );
        }

        expect(res.statusCode).to.be(200);
        expect(foundStream.name).to.be(testDataStreamName);
        expect(foundStream.storageSizeBytes).to.be.greaterThan(0);

        return true;
      });
    });
  });
}

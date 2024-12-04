/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DataStreamsResponseBodySchemaBody } from '@kbn/data-usage-plugin/common/rest_types';
import { DATA_USAGE_DATA_STREAMS_API_ROUTE } from '@kbn/data-usage-plugin/common';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import {
  NoIndicesMeteringError,
  NoPrivilegeMeteringError,
} from '@kbn/data-usage-plugin/server/common/errors';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlDatastreamsHelpers = getService('svlDatastreamsHelpers');
  const svlCommonApi = getService('svlCommonApi');
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const testDataStreamName = 'test-data-stream';
  const otherTestDataStreamName = 'other-test-data-stream';
  let roleAuthc: RoleCredentials;

  describe('privileges with custom roles', function () {
    // custom role testing is not supported in MKI
    // the metering api which this route calls requires one of: monitor,view_index_metadata,manage,all
    this.tags(['skipMKI']);
    before(async () => {
      await svlDatastreamsHelpers.createDataStream(testDataStreamName);
      await svlDatastreamsHelpers.createDataStream(otherTestDataStreamName);
    });
    after(async () => {
      await svlDatastreamsHelpers.deleteDataStream(testDataStreamName);
      await svlDatastreamsHelpers.deleteDataStream(otherTestDataStreamName);
    });
    afterEach(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      await samlAuth.deleteCustomRole();
    });
    it('returns all data streams for indices with necessary privileges', async () => {
      await samlAuth.setCustomRole({
        elasticsearch: {
          indices: [{ names: ['*'], privileges: ['all'] }],
        },
        kibana: [
          {
            base: ['all'],
            feature: {},
            spaces: ['*'],
          },
        ],
      });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('customRole');
      const res = await supertestWithoutAuth
        .get(DATA_USAGE_DATA_STREAMS_API_ROUTE)
        .query({ includeZeroStorage: true })
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .set('elastic-api-version', '1');

      const dataStreams: DataStreamsResponseBodySchemaBody = res.body;
      const foundTestDataStream = dataStreams.find((stream) => stream.name === testDataStreamName);
      const foundTestDataStream2 = dataStreams.find(
        (stream) => stream.name === otherTestDataStreamName
      );
      expect(res.statusCode).to.be(200);
      expect(foundTestDataStream?.name).to.be(testDataStreamName);
      expect(foundTestDataStream2?.name).to.be(otherTestDataStreamName);
    });
    it('returns data streams for only a subset of indices with necessary privileges', async () => {
      await samlAuth.setCustomRole({
        elasticsearch: {
          indices: [{ names: ['test-data-stream*'], privileges: ['all'] }],
        },
        kibana: [
          {
            base: ['all'],
            feature: {},
            spaces: ['*'],
          },
        ],
      });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('customRole');
      const res = await supertestWithoutAuth
        .get(DATA_USAGE_DATA_STREAMS_API_ROUTE)
        .query({ includeZeroStorage: true })
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .set('elastic-api-version', '1');

      const dataStreams: DataStreamsResponseBodySchemaBody = res.body;
      const foundTestDataStream = dataStreams.find((stream) => stream.name === testDataStreamName);
      const dataStreamNoPermission = dataStreams.find(
        (stream) => stream.name === otherTestDataStreamName
      );

      expect(res.statusCode).to.be(200);
      expect(foundTestDataStream?.name).to.be(testDataStreamName);
      expect(dataStreamNoPermission?.name).to.be(undefined);
    });
    it('returns no data streams without necessary privileges', async () => {
      await samlAuth.setCustomRole({
        elasticsearch: {
          indices: [{ names: ['*'], privileges: ['write'] }],
        },
        kibana: [
          {
            base: ['all'],
            feature: {},
            spaces: ['*'],
          },
        ],
      });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('customRole');
      const res = await supertestWithoutAuth
        .get(DATA_USAGE_DATA_STREAMS_API_ROUTE)
        .query({ includeZeroStorage: true })
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .set('elastic-api-version', '1');

      expect(res.statusCode).to.be(403);
      expect(res.body.message).to.contain(NoPrivilegeMeteringError);
    });
    it('returns no data streams when there are none it has access to', async () => {
      await samlAuth.setCustomRole({
        elasticsearch: {
          indices: [{ names: ['none*'], privileges: ['all'] }],
        },
        kibana: [
          {
            base: ['all'],
            feature: {},
            spaces: ['*'],
          },
        ],
      });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('customRole');
      const res = await supertestWithoutAuth
        .get(DATA_USAGE_DATA_STREAMS_API_ROUTE)
        .query({ includeZeroStorage: true })
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .set('elastic-api-version', '1');

      expect(res.statusCode).to.be(404);
      expect(res.body.message).to.contain(NoIndicesMeteringError);
    });
  });
}

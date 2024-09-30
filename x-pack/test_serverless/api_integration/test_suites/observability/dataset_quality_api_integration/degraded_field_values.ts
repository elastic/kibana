/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { DatasetQualityFtrContextProvider } from './common/services';
import type { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';

const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

const ANOTHER_1024_CHARS =
  'grape fig tangerine tangerine kiwi lemon papaya cherry nectarine papaya mango cherry nectarine fig cherry fig grape mango mango quince fig strawberry mango quince date kiwi quince raspberry apple kiwi banana quince fig papaya grape mango cherry banana mango cherry lemon cherry tangerine fig quince quince papaya tangerine grape strawberry banana kiwi grape mango papaya nectarine banana nectarine kiwi papaya lemon apple lemon orange fig cherry grape apple nectarine papaya orange fig papaya date mango papaya mango cherry tangerine papaya apple banana papaya cherry strawberry grape raspberry lemon date papaya mango kiwi cherry fig banana banana apple date strawberry mango tangerine date lemon kiwi quince date orange orange papaya date apple fig tangerine quince tangerine date papaya banana banana orange raspberry papaya apple nectarine lemon raspberry raspberry mango cherry kiwi cherry cherry nectarine cherry date strawberry banana orange mango mango tangerine quince papaya papaya kiwi papaya strawberry date mango';

export default function ApiTest({ getService }: DatasetQualityFtrContextProvider) {
  const synthtrace = getService('logSynthtraceEsClient');
  const datasetQualityApiClient = getService('datasetQualityApiClient');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');
  const start = '2024-08-28T08:00:00.000Z';
  const end = '2024-08-28T08:02:00.000Z';
  const degradedFieldDataset = 'nginx.error';
  const degradedFieldsDatastream = 'logs-nginx.error-default';
  const degradedFieldName = 'test_field';
  const regularFieldName = 'service.name';
  const serviceName = 'my-service';

  async function callApiAs({
    dataStream,
    degradedField,
    roleAuthc,
    internalReqHeader,
  }: {
    dataStream: string;
    degradedField: string;
    roleAuthc: RoleCredentials;
    internalReqHeader: InternalRequestHeader;
  }) {
    return await datasetQualityApiClient.slsUser({
      endpoint:
        'GET /internal/dataset_quality/data_streams/{dataStream}/degraded_field/{degradedField}/values',
      params: {
        path: {
          dataStream,
          degradedField,
        },
      },
      roleAuthc,
      internalReqHeader,
    });
  }

  describe('Degraded Fields Values per field', () => {
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await synthtrace.index([
        timerange(start, end)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            log
              .create()
              .message('This is a error message')
              .logLevel(MORE_THAN_1024_CHARS)
              .timestamp(timestamp)
              .dataset(degradedFieldDataset)
              .defaults({
                'log.file.path': '/error.log',
                'service.name': serviceName + 1,
                'trace.id': MORE_THAN_1024_CHARS,
                test_field: [ANOTHER_1024_CHARS, 'hello world', MORE_THAN_1024_CHARS],
              })
          ),
      ]);
    });

    after(async () => {
      await synthtrace.clean();
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('returns no values when provided field has no degraded values', async () => {
      const resp = await callApiAs({
        dataStream: degradedFieldsDatastream,
        degradedField: regularFieldName,
        roleAuthc,
        internalReqHeader,
      });
      expect(resp.body.values.length).to.be(0);
    });

    it('returns values when provided field has degraded values', async () => {
      const resp = await callApiAs({
        dataStream: degradedFieldsDatastream,
        degradedField: degradedFieldName,
        roleAuthc,
        internalReqHeader,
      });
      expect(resp.body.values.length).to.be(2);
    });
  });
}

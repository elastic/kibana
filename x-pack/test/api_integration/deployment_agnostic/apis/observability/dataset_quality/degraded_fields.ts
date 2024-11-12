/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { DegradedField } from '@kbn/dataset-quality-plugin/common/api_types';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { SupertestWithRoleScopeType } from '../../../services';
import { rolloverDataStream, createBackingIndexNameWithoutVersion } from './utils';

const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');
  const esClient = getService('es');
  const start = '2024-05-22T08:00:00.000Z';
  const end = '2024-05-23T08:02:00.000Z';
  const type = 'logs';
  const dataset = 'nginx.access';
  const degradedFieldDataset = 'nginx.error';
  const namespace = 'default';
  const serviceName = 'my-service';
  const hostName = 'synth-host';

  async function callApiAs(
    roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType,
    dataStream: string
  ) {
    return roleScopedSupertestWithCookieCredentials
      .get(`/internal/dataset_quality/data_streams/${dataStream}/degraded_fields`)
      .query({
        start,
        end,
      });
  }

  describe('Degraded Fields per DataStream', function () {
    let synthtraceLogsEsClient: LogsSynthtraceEsClient;
    let supertestEditorWithCookieCredentials: SupertestWithRoleScopeType;

    before(async () => {
      synthtraceLogsEsClient = await synthtrace.createLogsSynthtraceEsClient();
      supertestEditorWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'editor',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );
    });

    describe('gets the degraded fields per data stream', () => {
      before(async () => {
        await synthtraceLogsEsClient.index([
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
              log
                .create()
                .message('This is a log message')
                .timestamp(timestamp)
                .dataset(dataset)
                .namespace(namespace)
                .defaults({
                  'log.file.path': '/my-service.log',
                  'service.name': serviceName + 0,
                  'host.name': hostName,
                })
            ),
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
                .namespace(namespace)
                .defaults({
                  'log.file.path': '/error.log',
                  'service.name': serviceName + 1,
                  'trace.id': MORE_THAN_1024_CHARS,
                })
            ),
        ]);
      });

      after(async () => {
        await synthtraceLogsEsClient.clean();
      });

      it('returns no results when dataStream does not have any degraded fields', async () => {
        const resp = await callApiAs(
          supertestEditorWithCookieCredentials,
          `${type}-${dataset}-${namespace}`
        );
        expect(resp.body.degradedFields.length).to.be(0);
      });

      it('returns results when dataStream do have degraded fields', async () => {
        const expectedDegradedFields = ['log.level', 'trace.id'];
        const resp = await callApiAs(
          supertestEditorWithCookieCredentials,
          `${type}-${degradedFieldDataset}-${namespace}`
        );
        const degradedFields = resp.body.degradedFields.map((field: DegradedField) => field.name);

        expect(resp.body.degradedFields.length).to.be(2);
        expect(degradedFields).to.eql(expectedDegradedFields);
      });

      it('returns proper timeSeries data for degraded fields', async () => {
        const logsTimeSeriesData = [
          { x: 1716357600000, y: 60 },
          { x: 1716368400000, y: 180 },
          { x: 1716379200000, y: 180 },
          { x: 1716390000000, y: 180 },
          { x: 1716400800000, y: 180 },
          { x: 1716411600000, y: 180 },
          { x: 1716422400000, y: 180 },
          { x: 1716433200000, y: 180 },
          { x: 1716444000000, y: 122 },
        ];

        const resp = await callApiAs(
          supertestEditorWithCookieCredentials,
          `${type}-${degradedFieldDataset}-${namespace}`
        );

        const logLevelTimeSeries = resp.body.degradedFields.find(
          (dFields: DegradedField) => dFields.name === 'log.level'
        )?.timeSeries;

        expect(logLevelTimeSeries).to.eql(logsTimeSeriesData);
      });

      it('should return the backing index where the ignored field was last seen', async () => {
        await rolloverDataStream(esClient, `${type}-${degradedFieldDataset}-${namespace}`);
        await synthtraceLogsEsClient.index([
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
                .namespace(namespace)
                .defaults({
                  'log.file.path': '/error.log',
                  'service.name': serviceName + 1,
                })
            ),
        ]);

        const resp = await callApiAs(
          supertestEditorWithCookieCredentials,
          `${type}-${degradedFieldDataset}-${namespace}`
        );

        const logLevelLastBackingIndex = resp.body.degradedFields.find(
          (dFields: DegradedField) => dFields.name === 'log.level'
        )?.indexFieldWasLastPresentIn;

        const traceIdLastBackingIndex = resp.body.degradedFields.find(
          (dFields: DegradedField) => dFields.name === 'trace.id'
        )?.indexFieldWasLastPresentIn;

        expect(logLevelLastBackingIndex).to.be(
          `${createBackingIndexNameWithoutVersion({
            type,
            dataset: degradedFieldDataset,
            namespace,
          })}-000002`
        );
        expect(traceIdLastBackingIndex).to.be(
          `${createBackingIndexNameWithoutVersion({
            type,
            dataset: degradedFieldDataset,
            namespace,
          })}-000001`
        );
      });
    });
  });
}

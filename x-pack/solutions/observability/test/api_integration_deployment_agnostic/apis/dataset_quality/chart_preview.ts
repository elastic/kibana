/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import rison from '@kbn/rison';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { SupertestWithRoleScopeType } from '../../services';

const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');
  const start = '2025-04-11T08:00:00.000Z';
  const end = '2025-04-11T08:05:30.000Z';
  const type = 'logs';
  const dataset = 'nginx.access';
  const namespace = 'default';
  const serviceName = 'my-service';
  const otherServiceName = 'my-other-service';

  async function callApiAs(
    roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType,
    dataStream: string,
    groupBy = ['_index'],
    interval = '1m'
  ) {
    return roleScopedSupertestWithCookieCredentials
      .get(`/internal/dataset_quality/rule_types/degraded_docs/chart_preview`)
      .query({
        index: dataStream,
        groupBy: rison.encodeArray(groupBy),
        start: new Date(start).getTime(),
        end: new Date(end).getTime(),
        interval,
      });
  }

  describe('Chart preview per DataStream', function () {
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

    describe('gets the degraded fields timeseries per data stream', () => {
      before(async () => {
        await synthtraceLogsEsClient.index(
          Array.from({ length: 6 }, (_, i) =>
            timerange(start, end)
              .interval('1m')
              .rate(1)
              .generator((timestamp, j) =>
                log
                  .create()
                  .message('This is a log message')
                  .timestamp(timestamp)
                  .dataset(`${dataset}.${i}`)
                  .namespace(namespace)
                  .logLevel(i && j % i === 0 ? MORE_THAN_1024_CHARS : 'error')
                  .defaults({
                    'log.file.path': '/error.log',
                    'service.name': j % 2 ? serviceName + i : otherServiceName + 1,
                    'trace.id': i && j % i === 0 ? MORE_THAN_1024_CHARS : 'trace-id',
                  })
              )
          )
        );
      });

      after(async () => {
        await synthtraceLogsEsClient.clean();
      });

      it('returns proper timeSeries data for degraded fields when querying a single dataStream', async () => {
        const logsTimeSeriesData = [
          {
            name: 'logs-nginx.access.5-default',
            data: [
              { x: 1744358400000, y: 100 },
              { x: 1744358460000, y: 0 },
              { x: 1744358520000, y: 0 },
              { x: 1744358580000, y: 0 },
              { x: 1744358640000, y: 0 },
              { x: 1744358700000, y: 100 },
            ],
          },
        ];
        const resp = await callApiAs(
          supertestEditorWithCookieCredentials,
          `${type}-${dataset}.5-*`
        );

        expect(resp.body.series).to.eql(logsTimeSeriesData);
      });

      it('returns proper timeSeries data when querying at a specific interval', async () => {
        const logsTimeSeriesData = [
          {
            name: 'logs-nginx.access.1-default',
            data: [
              { x: 1744358400000, y: 100 },
              { x: 1744358700000, y: 100 },
            ],
          },
        ];
        const resp = await callApiAs(
          supertestEditorWithCookieCredentials,
          `${type}-${dataset}.1-*`,
          ['_index'],
          '5m'
        );

        expect(resp.body.series).to.eql(logsTimeSeriesData);
      });

      it('returns proper timeSeries data grouped using multiple keys', async () => {
        const logsTimeSeriesData = [
          {
            name: 'logs-nginx.access.1-default,my-other-service1',
            data: [
              { x: 1744358400000, y: 100 },
              { x: 1744358460000, y: 0 },
              { x: 1744358520000, y: 100 },
              { x: 1744358580000, y: 0 },
              { x: 1744358640000, y: 100 },
              { x: 1744358700000, y: 0 },
            ],
          },
          {
            name: 'logs-nginx.access.1-default,my-service1',
            data: [
              { x: 1744358400000, y: 0 },
              { x: 1744358460000, y: 100 },
              { x: 1744358520000, y: 0 },
              { x: 1744358580000, y: 100 },
              { x: 1744358640000, y: 0 },
              { x: 1744358700000, y: 100 },
            ],
          },
        ];
        const resp = await callApiAs(
          supertestEditorWithCookieCredentials,
          `${type}-${dataset}.1-*`,
          ['_index', 'service.name']
        );

        expect(resp.body.series).to.eql(logsTimeSeriesData);
      });

      it('returns maximum 5 proper timeseries but the totalGroups indicates that there were more', async () => {
        const resp = await callApiAs(
          supertestEditorWithCookieCredentials,
          `${type}-${dataset}.*-*`
        );

        expect(resp.body.series.length).to.be(5);
        expect(resp.body.totalGroups).to.be(6);
      });

      it('returns empty when dataStream does not exists or does not have data reported', async () => {
        const resp = await callApiAs(supertestEditorWithCookieCredentials, `${type}-other-*`);

        expect(resp.body.series.length).to.be(0);
        expect(resp.body.totalGroups).to.be(0);
      });
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { log, timerange } from '@kbn/apm-synthtrace-client';
import { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { SupertestWithRoleScopeType } from '../../../services';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createBackingIndexNameWithoutVersion, setDataStreamSettings } from './utils/es_utils';
import { logsSynthMappings } from './custom_mappings/custom_synth_mappings';

const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');
  const esClient = getService('es');
  const start = '2024-09-20T11:00:00.000Z';
  const end = '2024-09-20T11:01:00.000Z';
  const type = 'logs';
  const dataset = 'synth.good';
  const namespace = 'default';
  const serviceName = 'my-service';
  const hostName = 'synth-host';
  const dataStreamName = `${type}-${dataset}-${namespace}`;

  const customComponentTemplateName = 'logs-synth@mappings';

  async function callApiAs({
    roleScopedSupertestWithCookieCredentials,
    apiParams: { dataStream, degradedField, lastBackingIndex },
  }: {
    roleScopedSupertestWithCookieCredentials: SupertestWithRoleScopeType;
    apiParams: {
      dataStream: string;
      degradedField: string;
      lastBackingIndex: string;
    };
  }) {
    return roleScopedSupertestWithCookieCredentials
      .get(
        `/internal/dataset_quality/data_streams/${dataStream}/degraded_field/${degradedField}/analyze`
      )
      .query({ lastBackingIndex });
  }

  describe('Degraded field analyze', () => {
    let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;
    let synthtraceLogsEsClient: LogsSynthtraceEsClient;

    before(async () => {
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );
    });

    describe('gets limit analysis for a given datastream and degraded field', () => {
      before(async () => {
        synthtraceLogsEsClient = await synthtrace.createLogsSynthtraceEsClient();
        await synthtraceLogsEsClient.createComponentTemplate(
          customComponentTemplateName,
          logsSynthMappings(dataset)
        );
        await esClient.indices.putIndexTemplate({
          name: dataStreamName,
          _meta: {
            managed: false,
            description: 'custom synth template created by synthtrace tool.',
          },
          priority: 500,
          index_patterns: [dataStreamName],
          composed_of: [
            customComponentTemplateName,
            'logs@mappings',
            'logs@settings',
            'ecs@mappings',
          ],
          allow_auto_create: true,
          data_stream: {
            hidden: false,
          },
        });
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
                  'service.name': serviceName,
                  'host.name': hostName,
                  test_field: [MORE_THAN_1024_CHARS, 'hello world'],
                })
            ),
        ]);
      });

      it('should return default limits and should return isFieldLimitIssue as false', async () => {
        const resp = await callApiAs({
          roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
          apiParams: {
            dataStream: dataStreamName,
            degradedField: 'test_field',
            lastBackingIndex: `${createBackingIndexNameWithoutVersion({
              type,
              dataset,
              namespace,
            })}-000001`,
          },
        });

        expect(resp.body.isFieldLimitIssue).to.be(false);
        expect(resp.body.fieldCount).to.be(25);
        expect(resp.body.fieldMapping).to.eql({ type: 'keyword', ignore_above: 1024 });
        expect(resp.body.totalFieldLimit).to.be(1000);
        expect(resp.body.ignoreMalformed).to.be(true);
        expect(resp.body.nestedFieldLimit).to.be(50);
      });

      it('should return updated limits and should return isFieldLimitIssue as true', async () => {
        await setDataStreamSettings(esClient, dataStreamName, {
          'mapping.total_fields.limit': 25,
        });
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
                  'service.name': serviceName,
                  'host.name': hostName,
                  test_field: [MORE_THAN_1024_CHARS, 'hello world'],
                  'cloud.region': 'us-east-1',
                })
            ),
        ]);

        const resp = await callApiAs({
          roleScopedSupertestWithCookieCredentials: supertestAdminWithCookieCredentials,
          apiParams: {
            dataStream: dataStreamName,
            degradedField: 'cloud.region',
            lastBackingIndex: `${createBackingIndexNameWithoutVersion({
              type,
              dataset,
              namespace,
            })}-000001`,
          },
        });

        expect(resp.body.isFieldLimitIssue).to.be(true);
        expect(resp.body.fieldCount).to.be(25);
        expect(resp.body.fieldMapping).to.be(undefined); // As the field limit was reached, field cannot be mapped
        expect(resp.body.totalFieldLimit).to.be(25);
        expect(resp.body.ignoreMalformed).to.be(true);
        expect(resp.body.nestedFieldLimit).to.be(50);
      });

      after(async () => {
        await synthtraceLogsEsClient.clean();
        await esClient.indices.deleteIndexTemplate({ name: dataStreamName });
        await synthtraceLogsEsClient.deleteComponentTemplate(customComponentTemplateName);
      });
    });
  });
}

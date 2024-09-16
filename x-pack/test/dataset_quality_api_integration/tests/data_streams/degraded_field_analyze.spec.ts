/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { DatasetQualityApiClientKey } from '../../common/config';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { getBackingIndexNameWithoutLastPart, setDataStreamSettings } from './es_utils';

const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const synthtrace = getService('logSynthtraceEsClient');
  const datasetQualityApiClient = getService('datasetQualityApiClient');
  const esClient = getService('es');
  const start = '2023-12-11T18:00:00.000Z';
  const end = '2023-12-11T18:01:00.000Z';
  const type = 'logs';
  const dataset = 'synth.1';
  const namespace = 'default';
  const serviceName = 'my-service';
  const hostName = 'synth-host';

  async function callApiAs(
    user: DatasetQualityApiClientKey,
    dataStream: string,
    degradedField: string,
    lastBackingIndex: string
  ) {
    return await datasetQualityApiClient[user]({
      endpoint:
        'GET /internal/dataset_quality/data_streams/{dataStream}/degraded_field/{degradedField}/analyze',
      params: {
        path: {
          dataStream,
          degradedField,
        },
        query: {
          lastBackingIndex,
        },
      },
    });
  }

  registry.when('Degraded fields analyze', { config: 'basic' }, () => {
    describe('gets limit analysis for a given datastream and degraded field', () => {
      before(async () => {
        await synthtrace.index([
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
        const resp = await callApiAs(
          'datasetQualityMonitorUser',
          `${type}-${dataset}-${namespace}`,
          'test_field',
          `${getBackingIndexNameWithoutLastPart({
            type,
            dataset,
            namespace,
          })}-000001`
        );

        expect(resp.body.isFieldLimitIssue).to.be(false);
        expect(resp.body.fieldCount).to.be(25);
        expect(resp.body.fieldMapping).to.eql({ type: 'keyword', ignore_above: 1024 });
        expect(resp.body.totalFieldLimit).to.be(1000);
        expect(resp.body.ignoreMalformed).to.be(true);
        expect(resp.body.nestedFieldLimit).to.be(50);
      });

      it('should return updated limits and should return isFieldLimitIssue as true', async () => {
        const dataStream = `${type}-${dataset}-${namespace}`;
        await setDataStreamSettings(esClient, dataStream, {
          'mapping.total_fields.limit': 25,
        });
        await synthtrace.index([
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
        const resp = await callApiAs(
          'datasetQualityMonitorUser',
          dataStream,
          'cloud.region',
          `${getBackingIndexNameWithoutLastPart({
            type,
            dataset,
            namespace,
          })}-000001`
        );

        expect(resp.body.isFieldLimitIssue).to.be(true);
        expect(resp.body.fieldCount).to.be(25);
        expect(resp.body.fieldMapping).to.be(undefined); // As the field limit was reached, field cannot be mapped
        expect(resp.body.totalFieldLimit).to.be(25);
        expect(resp.body.ignoreMalformed).to.be(true);
        expect(resp.body.nestedFieldLimit).to.be(50);
      });

      after(async () => {
        await synthtrace.clean();
      });
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { PROCESSOR_EVENT } from '@kbn/apm-plugin/common/es_fields/apm';
import { SpanRaw } from '@kbn/apm-plugin/typings/es_schemas/raw/span_raw';
import { ErrorRaw } from '@kbn/apm-plugin/typings/es_schemas/raw/error_raw';
import { TransactionRaw } from '@kbn/apm-plugin/typings/es_schemas/raw/transaction_raw';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const es = getService('es');

  async function getMostRecentDoc(processorEvent: ProcessorEvent) {
    const response = await es.search<TransactionRaw | SpanRaw | ErrorRaw>({
      index: ['apm-*'],
      body: {
        query: {
          bool: {
            filter: [{ term: { [PROCESSOR_EVENT]: processorEvent } }],
          },
        },
        size: 1,
        sort: {
          '@timestamp': 'desc',
        },
      },
    });

    const doc = response.hits.hits[0]._source!;

    return {
      // @ts-expect-error
      id: doc[processorEvent].id as string,
      timestamp: doc['@timestamp'],
    };
  }

  registry.when('Event metadata', { config: 'basic', archives: ['apm_8.0.0'] }, () => {
    it('fetches transaction event metadata', async () => {
      const { id, timestamp } = await getMostRecentDoc(ProcessorEvent.transaction);

      const { body } = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/event_metadata/{processorEvent}/{id}',
        params: {
          path: {
            processorEvent: ProcessorEvent.transaction,
            id,
          },
          query: {
            start: timestamp,
            end: timestamp,
          },
        },
      });

      expect(body).keys('metadata').ok();

      expect(
        Object.keys(body.metadata).filter((key) => {
          return Array.isArray(body.metadata[key]);
        })
      );

      expect(body.metadata).keys(
        '@timestamp',
        'agent.name',
        'transaction.name',
        'transaction.type',
        'service.name'
      );
    });

    it('fetches error event metadata', async () => {
      const { id, timestamp } = await getMostRecentDoc(ProcessorEvent.error);

      const { body } = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/event_metadata/{processorEvent}/{id}',
        params: {
          path: {
            processorEvent: ProcessorEvent.error,
            id,
          },
          query: {
            start: timestamp,
            end: timestamp,
          },
        },
      });

      expect(body).keys('metadata').ok();

      expect(
        Object.keys(body.metadata).filter((key) => {
          return Array.isArray(body.metadata[key]);
        })
      );

      expect(body.metadata).keys(
        '@timestamp',
        'agent.name',
        'error.grouping_key',
        'error.grouping_name',
        'service.name'
      );
    });

    it('fetches span event metadata', async () => {
      const { id, timestamp } = await getMostRecentDoc(ProcessorEvent.span);

      const { body } = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/event_metadata/{processorEvent}/{id}',
        params: {
          path: {
            processorEvent: ProcessorEvent.span,
            id,
          },
          query: {
            start: timestamp,
            end: timestamp,
          },
        },
      });

      expect(body).keys('metadata').ok();

      expect(
        Object.keys(body.metadata).filter((key) => {
          return Array.isArray(body.metadata[key]);
        })
      );

      expect(body.metadata).keys(
        '@timestamp',
        'agent.name',
        'span.name',
        'span.type',
        'service.name'
      );
    });
  });
}

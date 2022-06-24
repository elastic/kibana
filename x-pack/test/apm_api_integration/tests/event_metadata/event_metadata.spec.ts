/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { PROCESSOR_EVENT } from '@kbn/apm-plugin/common/elasticsearch_fieldnames';
import { ProcessorEvent } from '@kbn/apm-plugin/common/processor_event';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const esClient = getService('es');

  async function getLastDocId(processorEvent: ProcessorEvent) {
    const response = await esClient.search<{
      [key: string]: { id: string };
    }>({
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

    return response.hits.hits[0]._source![processorEvent].id;
  }

  registry.when('Event metadata', { config: 'basic', archives: ['apm_8.0.0'] }, () => {
    it('fetches transaction event metadata', async () => {
      const id = await getLastDocId(ProcessorEvent.transaction);

      const { body } = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/event_metadata/{processorEvent}/{id}',
        params: {
          path: {
            processorEvent: ProcessorEvent.transaction,
            id,
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
      const id = await getLastDocId(ProcessorEvent.error);

      const { body } = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/event_metadata/{processorEvent}/{id}',
        params: {
          path: {
            processorEvent: ProcessorEvent.error,
            id,
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
      const id = await getLastDocId(ProcessorEvent.span);

      const { body } = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/event_metadata/{processorEvent}/{id}',
        params: {
          path: {
            processorEvent: ProcessorEvent.span,
            id,
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

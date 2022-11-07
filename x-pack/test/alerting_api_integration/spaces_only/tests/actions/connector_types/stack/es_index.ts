/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

const ES_TEST_INDEX_NAME = 'functional-test-connectors-index';
const ES_TEST_DATASTREAM_PREFIX = 'functional-test-connectors-ds';
const ES_TEST_DATASTREAM_PATTERN_NAME = `${ES_TEST_DATASTREAM_PREFIX}-*`;
const ES_TEST_DATASTREAM_INDEX_NAME = `${ES_TEST_DATASTREAM_PREFIX}-00001`;

// eslint-disable-next-line import/no-default-export
export default function indexTest({ getService }: FtrProviderContext) {
  const es: Client = getService('es');
  const supertest = getService('supertest');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  describe('index connector', () => {
    beforeEach(() => {
      esDeleteAllIndices(ES_TEST_INDEX_NAME);
      esDeleteAllIndices(ES_TEST_DATASTREAM_INDEX_NAME);
    });

    after(async () => {
      await es.transport.request({
        method: 'DELETE',
        path: `/_data_stream/${ES_TEST_DATASTREAM_INDEX_NAME}`,
      });
      await es.transport.request({
        method: 'DELETE',
        path: `/_index_template/${ES_TEST_DATASTREAM_PREFIX}`,
      });
    });

    let createdConnectorID: string;
    let createdConnectorIDWithIndex: string;

    it('should be created successfully', async () => {
      // create action with no config
      const { body: createdConnector } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An index connector',
          connector_type_id: '.index',
          config: { index: ES_TEST_INDEX_NAME },
          secrets: {},
        })
        .expect(200);

      expect(createdConnector).to.eql({
        id: createdConnector.id,
        is_preconfigured: false,
        is_deprecated: false,
        name: 'An index connector',
        connector_type_id: '.index',
        is_missing_secrets: false,
        config: {
          index: ES_TEST_INDEX_NAME,
          refresh: false,
          executionTimeField: null,
        },
      });
      createdConnectorID = createdConnector.id;
      expect(typeof createdConnectorID).to.be('string');

      const { body: fetchedConnector } = await supertest
        .get(`/api/actions/connector/${createdConnectorID}`)
        .expect(200);

      expect(fetchedConnector).to.eql({
        id: fetchedConnector.id,
        is_preconfigured: false,
        is_deprecated: false,
        is_missing_secrets: false,
        name: 'An index connector',
        connector_type_id: '.index',
        config: { index: ES_TEST_INDEX_NAME, refresh: false, executionTimeField: null },
      });

      // create connector with all config props
      const { body: createdConnectorWithIndex } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An index connector with index config',
          connector_type_id: '.index',
          config: {
            index: ES_TEST_INDEX_NAME,
            refresh: true,
            executionTimeField: 'test',
          },
        })
        .expect(200);

      expect(createdConnectorWithIndex).to.eql({
        id: createdConnectorWithIndex.id,
        is_preconfigured: false,
        is_deprecated: false,
        name: 'An index connector with index config',
        connector_type_id: '.index',
        is_missing_secrets: false,
        config: {
          index: ES_TEST_INDEX_NAME,
          refresh: true,
          executionTimeField: 'test',
        },
      });
      createdConnectorIDWithIndex = createdConnectorWithIndex.id;
      expect(typeof createdConnectorIDWithIndex).to.be('string');

      const { body: fetchedConnectorWithIndex } = await supertest
        .get(`/api/actions/connector/${createdConnectorIDWithIndex}`)
        .expect(200);

      expect(fetchedConnectorWithIndex).to.eql({
        id: fetchedConnectorWithIndex.id,
        is_preconfigured: false,
        is_deprecated: false,
        name: 'An index connector with index config',
        connector_type_id: '.index',
        is_missing_secrets: false,
        config: {
          index: ES_TEST_INDEX_NAME,
          refresh: true,
          executionTimeField: 'test',
        },
      });
    });

    it('should execute successfully when expected for a single body', async () => {
      const { body: createdConnector } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An index connector',
          connector_type_id: '.index',
          config: {
            index: ES_TEST_INDEX_NAME,
            refresh: true,
          },
          secrets: {},
        })
        .expect(200);
      const { body: result } = await supertest
        .post(`/api/actions/connector/${createdConnector.id}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            documents: [{ testing: [1, 2, 3] }],
          },
        })
        .expect(200);
      expect(result.status).to.eql('ok');

      const items = await getTestIndexItems(es, ES_TEST_INDEX_NAME);
      expect(items.length).to.eql(1);
      expect(items[0]._source).to.eql({ testing: [1, 2, 3] });
    });

    it('should execute successfully into data stream', async () => {
      await es.transport.request(
        {
          method: 'PUT',
          path: `/_index_template/${ES_TEST_DATASTREAM_PREFIX}`,
          body: {
            index_patterns: [ES_TEST_DATASTREAM_PATTERN_NAME],
            template: {
              mappings: {
                properties: {
                  '@timestamp': {
                    type: 'date',
                  },
                },
              },
            },
            data_stream: {},
          },
        },
        { meta: true }
      );
      const { body: createdConnector } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An index connector',
          connector_type_id: '.index',
          config: {
            index: ES_TEST_DATASTREAM_INDEX_NAME,
            refresh: true,
          },
          secrets: {},
        })
        .expect(200);

      const timestamp = new Date().toISOString();
      const { body: result } = await supertest
        .post(`/api/actions/connector/${createdConnector.id}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            documents: [{ '@timestamp': timestamp, testing_ds: [1, 2, 3] }],
          },
        })
        .expect(200);
      expect(result.status).to.eql('ok');

      const items = await getTestIndexItems(es, ES_TEST_DATASTREAM_INDEX_NAME);
      expect(items.length).to.eql(1);
      expect(items[0]._source).to.eql({ '@timestamp': timestamp, testing_ds: [1, 2, 3] });
    });
  });
}

async function getTestIndexItems(es: Client, indexName: string) {
  const result = await es.search({
    index: indexName,
  });

  return result.hits.hits;
}

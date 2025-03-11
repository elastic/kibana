/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import expect from '@kbn/expect';
import { ClientRequestParamsOf } from '@kbn/server-route-repository-utils';
import { StreamsRouteRepository } from '@kbn/streams-plugin/server';
import { errors as esErrors } from '@elastic/elasticsearch';
import { disableStreams, enableStreams, forkStream, indexDocument } from './helpers/requests';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';

async function simulateProcessingForStream(
  client: StreamsSupertestRepositoryClient,
  name: string,
  body: ClientRequestParamsOf<
    StreamsRouteRepository,
    'POST /api/streams/{name}/processing/_simulate'
  >['params']['body'],
  statusCode = 200
) {
  return client
    .fetch('POST /api/streams/{name}/processing/_simulate', {
      params: {
        path: { name },
        body,
      },
    })
    .expect(statusCode);
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Processing Simulation', () => {
    const TEST_TIMESTAMP = '2025-01-01T00:00:10.000Z';
    const TEST_MESSAGE = `${TEST_TIMESTAMP} error test`;
    const TEST_HOST = 'test-host';

    const testDoc = {
      '@timestamp': TEST_TIMESTAMP,
      message: TEST_MESSAGE,
      'host.name': TEST_HOST,
      'log.level': 'error',
    };

    const basicDissectProcessor = {
      id: 'dissect-uuid',
      dissect: {
        field: 'message',
        pattern: '%{parsed_timestamp} %{parsed_level} %{parsed_message}',
        if: { always: {} },
      },
    };

    const basicGrokProcessor = {
      id: 'draft',
      grok: {
        field: 'message',
        patterns: [
          '%{TIMESTAMP_ISO8601:parsed_timestamp} %{LOGLEVEL:parsed_level} %{GREEDYDATA:parsed_message}',
        ],
        if: { always: {} },
      },
    };

    const createTestDocument = (message = TEST_MESSAGE) => ({
      '@timestamp': TEST_TIMESTAMP,
      message,
    });

    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);

      await enableStreams(apiClient);

      // Create a test document
      await indexDocument(esClient, 'logs', testDoc);

      // Create a forked stream for testing
      await forkStream(apiClient, 'logs', {
        stream: {
          name: 'logs.test',
        },
        if: {
          field: 'host.name',
          operator: 'eq' as const,
          value: TEST_HOST,
        },
      });
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('Successful simulations', () => {
      it('should simulate additive processing', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: [basicGrokProcessor],
          documents: [createTestDocument()],
        });

        expect(response.body.success_rate).to.be(1);
        expect(response.body.failure_rate).to.be(0);

        const { detected_fields, errors, status, value } = response.body.documents[0];
        expect(status).to.be('parsed');
        expect(errors).to.eql([]);
        expect(detected_fields).to.eql([
          { processor_id: 'draft', name: 'parsed_level' },
          { processor_id: 'draft', name: 'parsed_message' },
          { processor_id: 'draft', name: 'parsed_timestamp' },
        ]);
        expect(value).to.have.property('parsed_level', 'error');
        expect(value).to.have.property('parsed_message', 'test');
        expect(value).to.have.property('parsed_timestamp', TEST_TIMESTAMP);
      });

      it('should simulate with detected fields', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: [basicGrokProcessor],
          documents: [createTestDocument()],
          detected_fields: [
            { name: 'parsed_timestamp', type: 'date' },
            { name: 'parsed_level', type: 'keyword' },
          ],
        });

        const findField = (name: string) =>
          response.body.detected_fields.find((f: { name: string }) => f.name === name);

        expect(response.body.detected_fields).to.have.length(3); // Including parsed_message
        expect(findField('parsed_timestamp')).to.have.property('type', 'date');
        expect(findField('parsed_level')).to.have.property('type', 'keyword');
      });

      it('should simulate multiple sequential processors', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: [
            basicDissectProcessor,
            {
              id: 'draft',
              grok: {
                field: 'parsed_message',
                patterns: ['%{IP:parsed_ip}'],
                if: { always: {} },
              },
            },
          ],
          documents: [createTestDocument(`${TEST_MESSAGE} 127.0.0.1`)],
        });

        expect(response.body.success_rate).to.be(1);
        expect(response.body.failure_rate).to.be(0);

        const { detected_fields, status, value } = response.body.documents[0];
        expect(status).to.be('parsed');
        expect(detected_fields).to.eql([
          { processor_id: 'dissect-uuid', name: 'parsed_level' },
          { processor_id: 'dissect-uuid', name: 'parsed_message' },
          { processor_id: 'dissect-uuid', name: 'parsed_timestamp' },
          { processor_id: 'draft', name: 'parsed_ip' },
        ]);
        expect(value).to.have.property('parsed_level', 'error');
        expect(value).to.have.property('parsed_message', 'test 127.0.0.1');
        expect(value).to.have.property('parsed_timestamp', TEST_TIMESTAMP);
        expect(value).to.have.property('parsed_ip', '127.0.0.1');
      });

      it('should simulate partially parsed documents', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: [
            basicDissectProcessor, // This processor will correctly extract fields
            {
              id: 'draft',
              grok: {
                field: 'parsed_message',
                patterns: ['%{TIMESTAMP_ISO8601:other_date}'], // This processor will fail, as won't match another date from the remaining message
                if: { always: {} },
              },
            },
          ],
          documents: [createTestDocument(`${TEST_MESSAGE} 127.0.0.1`)],
        });

        expect(response.body.success_rate).to.be(0);
        expect(response.body.failure_rate).to.be(1);

        const { detected_fields, status, value } = response.body.documents[0];
        expect(status).to.be('partially_parsed');
        expect(detected_fields).to.eql([
          { processor_id: 'dissect-uuid', name: 'parsed_level' },
          { processor_id: 'dissect-uuid', name: 'parsed_message' },
          { processor_id: 'dissect-uuid', name: 'parsed_timestamp' },
        ]);
        expect(value).to.have.property('parsed_level', 'error');
        expect(value).to.have.property('parsed_message', 'test 127.0.0.1');
        expect(value).to.have.property('parsed_timestamp', TEST_TIMESTAMP);
      });

      it('should return processor metrics', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: [
            basicDissectProcessor, // This processor will correctly extract fields
            {
              id: 'draft',
              grok: {
                field: 'parsed_message',
                patterns: ['%{TIMESTAMP_ISO8601:other_date}'], // This processor will fail, as won't match another date from the remaining message
                if: { always: {} },
              },
            },
          ],
          documents: [createTestDocument(`${TEST_MESSAGE} 127.0.0.1`)],
        });

        const processorsMetrics = response.body.processors_metrics;
        const dissectMetrics = processorsMetrics['dissect-uuid'];
        const grokMetrics = processorsMetrics.draft;

        expect(dissectMetrics.detected_fields).to.eql([
          'parsed_level',
          'parsed_message',
          'parsed_timestamp',
        ]);
        expect(dissectMetrics.errors).to.eql([]);
        expect(dissectMetrics.failure_rate).to.be(0);
        expect(dissectMetrics.success_rate).to.be(1);

        expect(grokMetrics.detected_fields).to.eql([]);
        expect(grokMetrics.errors).to.eql([
          {
            processor_id: 'draft',
            type: 'generic_processor_failure',
            message: 'Provided Grok expressions do not match field value: [test 127.0.0.1]',
          },
        ]);
        expect(grokMetrics.failure_rate).to.be(1);
        expect(grokMetrics.success_rate).to.be(0);
      });

      it('should return accurate success/failure rates', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: [
            basicDissectProcessor,
            {
              id: 'draft',
              grok: {
                field: 'parsed_message',
                patterns: ['%{IP:parsed_ip}'],
                if: { always: {} },
              },
            },
          ],
          documents: [
            createTestDocument(`${TEST_MESSAGE} 127.0.0.1`),
            createTestDocument(),
            createTestDocument(`${TEST_TIMESTAMP} info test`),
            createTestDocument('invalid format'),
          ],
        });

        expect(response.body.success_rate).to.be(0.25);
        expect(response.body.failure_rate).to.be(0.75);
        expect(response.body.documents).to.have.length(4);
        expect(response.body.documents[0].status).to.be('parsed');
        expect(response.body.documents[1].status).to.be('partially_parsed');
        expect(response.body.documents[2].status).to.be('partially_parsed');
        expect(response.body.documents[3].status).to.be('failed');

        const processorsMetrics = response.body.processors_metrics;
        const dissectMetrics = processorsMetrics['dissect-uuid'];
        const grokMetrics = processorsMetrics.draft;

        expect(dissectMetrics.failure_rate).to.be(0.25);
        expect(dissectMetrics.success_rate).to.be(0.75);
        expect(grokMetrics.failure_rate).to.be(0.75);
        expect(grokMetrics.success_rate).to.be(0.25);
      });

      it('should allow overriding fields detected by previous simulation processors (skip non-additive check)', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: [
            basicDissectProcessor,
            {
              id: 'draft',
              grok: {
                field: 'parsed_message',
                patterns: ['%{WORD:ignored_field} %{IP:parsed_ip} %{GREEDYDATA:parsed_message}'], // Try overriding parsed_message previously computed by dissect
                if: { always: {} },
              },
            },
          ],
          documents: [createTestDocument(`${TEST_MESSAGE} 127.0.0.1 greedy data message`)],
        });

        expect(response.body.success_rate).to.be(1);
        expect(response.body.failure_rate).to.be(0);

        const { detected_fields, status, value } = response.body.documents[0];
        expect(status).to.be('parsed');
        expect(detected_fields).to.eql([
          { processor_id: 'dissect-uuid', name: 'parsed_level' },
          { processor_id: 'dissect-uuid', name: 'parsed_message' },
          { processor_id: 'dissect-uuid', name: 'parsed_timestamp' },
          { processor_id: 'draft', name: 'ignored_field' },
          { processor_id: 'draft', name: 'parsed_ip' },
          { processor_id: 'draft', name: 'parsed_message' },
        ]);
        expect(value).to.have.property('parsed_message', 'greedy data message');
      });

      it('should gracefully return the errors for each partially parsed or failed document', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: [
            basicDissectProcessor, // This processor will correctly extract fields
            {
              id: 'draft',
              grok: {
                field: 'parsed_message',
                patterns: ['%{TIMESTAMP_ISO8601:other_date}'], // This processor will fail, as won't match another date from the remaining message
                if: { always: {} },
              },
            },
          ],
          documents: [createTestDocument(`${TEST_MESSAGE} 127.0.0.1`)],
        });

        const { errors, status } = response.body.documents[0];
        expect(status).to.be('partially_parsed');
        expect(errors).to.eql([
          {
            processor_id: 'draft',
            type: 'generic_processor_failure',
            message: 'Provided Grok expressions do not match field value: [test 127.0.0.1]',
          },
        ]);
      });

      it('should gracefully return failed simulation errors', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: [
            {
              id: 'draft',
              grok: {
                field: 'message',
                patterns: ['%{INVALID_PATTERN:field}'],
                if: { always: {} },
              },
            },
          ],
          documents: [createTestDocument('test message')],
        });

        const processorsMetrics = response.body.processors_metrics;
        const grokMetrics = processorsMetrics.draft;

        expect(grokMetrics.errors).to.eql([
          {
            processor_id: 'draft',
            type: 'generic_simulation_failure',
            message:
              "[patterns] Invalid regex pattern found in: [%{INVALID_PATTERN:field}]. Unable to find pattern [INVALID_PATTERN] in Grok's pattern dictionary",
          },
        ]);
      });

      it('should gracefully return non-additive simulation errors', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: [
            {
              id: 'draft',
              grok: {
                field: 'message',
                patterns: [
                  // This overwrite the exising log.level and message values
                  '%{TIMESTAMP_ISO8601:parsed_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message}',
                ],
                if: { always: {} },
              },
            },
          ],
          documents: [{ ...createTestDocument(), 'log.level': 'info' }],
        });

        const processorsMetrics = response.body.processors_metrics;
        const grokMetrics = processorsMetrics.draft;

        expect(grokMetrics.errors).to.eql([
          {
            processor_id: 'draft',
            type: 'non_additive_processor_failure',
            message:
              'The processor is not additive to the documents. It might update fields [log.level,message]',
          },
        ]);
      });

      it('should return the is_non_additive_simulation simulation flag', async () => {
        const [additiveParsingResponse, nonAdditiveParsingResponse] = await Promise.all([
          simulateProcessingForStream(apiClient, 'logs.test', {
            processing: [basicGrokProcessor],
            documents: [createTestDocument()],
          }),
          simulateProcessingForStream(apiClient, 'logs.test', {
            processing: [
              {
                id: 'draft',
                grok: {
                  field: 'message',
                  patterns: [
                    // This overwrite the exising log.level and message values
                    '%{TIMESTAMP_ISO8601:parsed_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message}',
                  ],
                  if: { always: {} },
                },
              },
            ],
            documents: [{ ...createTestDocument(), 'log.level': 'info' }],
          }),
        ]);

        expect(additiveParsingResponse.body.is_non_additive_simulation).to.be(false);
        expect(nonAdditiveParsingResponse.body.is_non_additive_simulation).to.be(true);
      });
    });

    describe('Failed simulations', () => {
      it('should fail with incompatible detected field mappings', async () => {
        const response = await simulateProcessingForStream(
          apiClient,
          'logs.test',
          {
            processing: [basicGrokProcessor],
            documents: [createTestDocument()],
            detected_fields: [
              { name: 'parsed_timestamp', type: 'boolean' }, // Incompatible type
            ],
          },
          400
        );

        expect((response.body as esErrors.ResponseError['body']).message).to.contain(
          'The detected field types might not be compatible with these documents.'
        );
      });
    });
  });
}

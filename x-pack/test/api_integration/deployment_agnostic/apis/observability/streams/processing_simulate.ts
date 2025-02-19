/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ClientRequestParamsOf } from '@kbn/server-route-repository-utils';
import { StreamsRouteRepository } from '@kbn/streams-plugin/server';
import { errors } from '@elastic/elasticsearch';
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

    const basicGrokProcessor = {
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
      describe('with valid documents', () => {
        it('should simulate additive processing', async () => {
          const response = await simulateProcessingForStream(apiClient, 'logs.test', {
            processing: [basicGrokProcessor],
            documents: [createTestDocument()],
          });

          expect(response.body.success_rate).to.be(1);
          expect(response.body.failure_rate).to.be(0);

          const { isMatch, value } = response.body.documents[0];
          expect(isMatch).to.be(true);
          expect(value).to.have.property('parsed_timestamp', TEST_TIMESTAMP);
          expect(value).to.have.property('parsed_level', 'error');
          expect(value).to.have.property('parsed_message', 'test');
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
      });

      describe('with mixed success/failure documents', () => {
        it('should provide accurate success/failure rates', async () => {
          const response = await simulateProcessingForStream(apiClient, 'logs.test', {
            processing: [basicGrokProcessor],
            documents: [
              createTestDocument(),
              createTestDocument('invalid format'),
              createTestDocument(`${TEST_TIMESTAMP} info test`),
            ],
          });

          expect(response.body.success_rate).to.be(0.67);
          expect(response.body.failure_rate).to.be(0.33);
          expect(response.body.documents).to.have.length(3);
          expect(response.body.documents[0].isMatch).to.be(true);
          expect(response.body.documents[1].isMatch).to.be(false);
          expect(response.body.documents[2].isMatch).to.be(true);
        });
      });
    });

    describe('Failed simulations', () => {
      it('should fail with invalid processor configurations', async () => {
        await simulateProcessingForStream(
          apiClient,
          'logs.test',
          {
            processing: [
              {
                grok: {
                  field: 'message',
                  patterns: ['%{INVALID_PATTERN:field}'],
                  if: { always: {} },
                },
              },
            ],
            documents: [createTestDocument('test message')],
          },
          // this should be a 400, but ES reports this as a 500
          500
        );
      });

      it('should fail when attempting to update existing fields', async () => {
        const response = await simulateProcessingForStream(
          apiClient,
          'logs.test',
          {
            processing: [
              {
                grok: {
                  field: 'message',
                  patterns: ['%{TIMESTAMP_ISO8601:parsed_timestamp} %{GREEDYDATA:message}'], // Overwrites existing message field
                  if: { always: {} },
                },
              },
            ],
            documents: [createTestDocument(`${TEST_TIMESTAMP} original message`)],
          },
          400
        );

        expect((response.body as errors.ResponseError['body']).message).to.contain(
          'The processor is not additive to the documents. It might update fields [message]'
        );
      });

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

        expect((response.body as errors.ResponseError['body']).message).to.contain(
          'The detected field types might not be compatible with these documents.'
        );
      });
    });

    describe('Partial success simulations', () => {
      it('should handle mixed success/failure documents', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: [basicGrokProcessor],
          documents: [
            createTestDocument(), // Will succeed
            createTestDocument('invalid format'), // Will fail
          ],
        });

        expect(response.body.success_rate).to.be(0.5);
        expect(response.body.failure_rate).to.be(0.5);
        expect(response.body.documents[0].isMatch).to.be(true);
        expect(response.body.documents[1].isMatch).to.be(false);
      });
    });
  });
}

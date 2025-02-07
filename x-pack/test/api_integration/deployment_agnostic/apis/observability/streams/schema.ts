/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { disableStreams, enableStreams, forkStream, indexDocument } from './helpers/requests';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Streams Schema', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

      const doc = {
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
        ['some.field']: 'some value',
        ['another.field']: 'another value',
        lastField: 'last value',
        ['log.level']: 'warning',
      };

      await indexDocument(esClient, 'logs', doc);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('Unmapped fields API', () => {
      it('Returns unmapped fields', async () => {
        const response = await apiClient
          .fetch('GET /api/streams/{name}/schema/unmapped_fields', {
            params: {
              path: {
                name: 'logs',
              },
            },
          })
          .expect(200);
        expect(response.body.unmappedFields).to.eql(['another.field', 'lastField', 'some.field']);
      });
    });

    describe('Fields simulation API', () => {
      it('Returns failure status when simulation would fail', async () => {
        const response = await apiClient.fetch(
          'POST /api/streams/{name}/schema/fields_simulation',
          {
            params: {
              path: {
                name: 'logs',
              },
              body: {
                field_definitions: [{ name: 'message', type: 'boolean' }],
              },
            },
          }
        );

        expect(response.body.status).to.be('failure');
        expect(response.body.simulationError).to.be.a('string');
        expect(response.body.documentsWithRuntimeFieldsApplied).to.be(null);
      });
      it('Returns success status when simulation would succeed', async () => {
        const response = await apiClient.fetch(
          'POST /api/streams/{name}/schema/fields_simulation',
          {
            params: {
              path: {
                name: 'logs',
              },
              body: {
                field_definitions: [{ name: 'message', type: 'keyword' }],
              },
            },
          }
        );

        expect(response.body.status).to.be('success');
        expect(response.body.simulationError).to.be(null);
        expect(response.body.documentsWithRuntimeFieldsApplied).length(1);
      });
      it('Returns unknown status when documents are missing and status cannot be determined', async () => {
        const forkBody = {
          stream: {
            name: 'logs.nginx',
          },
          if: {
            field: 'log.logger',
            operator: 'eq' as const,
            value: 'nginx',
          },
        };

        await forkStream(apiClient, 'logs', forkBody);
        const response = await apiClient.fetch(
          'POST /api/streams/{name}/schema/fields_simulation',
          {
            params: {
              path: {
                name: 'logs.nginx',
              },
              body: {
                field_definitions: [{ name: 'message', type: 'keyword' }],
              },
            },
          }
        );

        expect(response.body.status).to.be('unknown');
        expect(response.body.simulationError).to.be(null);
        expect(response.body.documentsWithRuntimeFieldsApplied).to.be(null);
      });
    });
  });
}

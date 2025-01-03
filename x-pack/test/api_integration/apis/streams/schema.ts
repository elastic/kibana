/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  deleteStream,
  enableStreams,
  forkStream,
  getUnmappedFieldsForStream,
  indexDocument,
  simulateFieldsForStream,
} from './helpers/requests';
import { FtrProviderContext } from '../../ftr_provider_context';
import { cleanUpRootStream } from './helpers/cleanup';
import { waitForDocumentInIndex } from '../../../alerting_api_integration/observability/helpers/alerting_wait_for_helpers';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esClient = getService('es');
  const retryService = getService('retry');
  const logger = getService('log');

  describe('Streams Schema', () => {
    after(async () => {
      await deleteStream(supertest, 'logs.nginx');
      await cleanUpRootStream(esClient);
    });

    before(async () => {
      await enableStreams(supertest);

      const doc = {
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
        ['some.field']: 'some value',
        ['another.field']: 'another value',
        lastField: 'last value',
        ['log.level']: 'warning',
      };

      await indexDocument(esClient, 'logs', doc);
      await waitForDocumentInIndex({ esClient, indexName: 'logs', retryService, logger });
    });

    describe('Unmapped fields API', () => {
      it('Returns unmapped fields', async () => {
        const response = await getUnmappedFieldsForStream(supertest, 'logs');
        expect(response.unmappedFields).to.eql(['another.field', 'lastField', 'some.field']);
      });
    });

    describe('Fields simulation API', () => {
      it('Returns failure status when simulation would fail', async () => {
        const response = await simulateFieldsForStream(supertest, 'logs', {
          field_definitions: [{ name: 'message', type: 'boolean' }],
        });

        expect(response.status).to.be('failure');
        expect(response.simulationError).to.be.a('string');
        expect(response.documentsWithRuntimeFieldsApplied).to.be(null);
      });
      it('Returns success status when simulation would succeed', async () => {
        const response = await simulateFieldsForStream(supertest, 'logs', {
          field_definitions: [{ name: 'message', type: 'keyword' }],
        });

        expect(response.status).to.be('success');
        expect(response.simulationError).to.be(null);
        expect(response.documentsWithRuntimeFieldsApplied).length(1);
      });
      it('Returns unknown status when documents are missing and status cannot be determined', async () => {
        const forkBody = {
          stream: {
            name: 'logs.nginx',
          },
          condition: {
            field: 'log.logger',
            operator: 'eq',
            value: 'nginx',
          },
        };

        await forkStream(supertest, 'logs', forkBody);
        const response = await simulateFieldsForStream(supertest, 'logs.nginx', {
          field_definitions: [{ name: 'message', type: 'keyword' }],
        });

        expect(response.status).to.be('unknown');
        expect(response.simulationError).to.be(null);
        expect(response.documentsWithRuntimeFieldsApplied).to.be(null);
      });
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('bulk_enqueue', () => {
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });
    after(async () => {
      await esTestIndexTool.destroy();
      await objectRemover.removeAll();
    });

    it('should handle bulk_enqueue request appropriately', async () => {
      const { body: createdConnector } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My Connector',
          connector_type_id: 'test.index-record',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(200);

      objectRemover.add(Spaces.space1.id, createdConnector.id, 'connector', 'actions');

      const reference = `actions-enqueue-1:${Spaces.space1.id}:${createdConnector.id}`;

      const response = await supertest
        .post(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerts_fixture/${
            createdConnector.id
          }/bulk_enqueue_actions`
        )
        .set('kbn-xsrf', 'foo')
        .send({
          params: { reference, index: ES_TEST_INDEX_NAME, message: 'Testing 123' },
        });

      expect(response.status).to.eql(204);
      await esTestIndexTool.waitForDocs('action:test.index-record', reference, 1);
    });

    it('should enqueue system actions correctly', async () => {
      const connectorId = 'system-connector-test.system-action-kibana-privileges';
      const reference = `actions-enqueue-1:${Spaces.space1.id}:${connectorId}`;

      const response = await supertest
        .post(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerts_fixture/${connectorId}/bulk_enqueue_actions`
        )
        .set('kbn-xsrf', 'foo')
        .send({
          params: { index: ES_TEST_INDEX_NAME, reference },
        });

      expect(response.status).to.eql(204);

      await esTestIndexTool.waitForDocs(
        'action:test.system-action-kibana-privileges',
        reference,
        1
      );
    });
  });
}

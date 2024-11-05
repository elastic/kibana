/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { checkAAD, getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function updateConnectorTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('update', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should handle update connector request appropriately', async () => {
      const { body: createdConnector } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My connector',
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

      await supertest
        .put(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/${createdConnector.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My connector updated',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(200, {
          id: createdConnector.id,
          is_preconfigured: false,
          is_system_action: false,
          is_deprecated: false,
          connector_type_id: 'test.index-record',
          is_missing_secrets: false,
          name: 'My connector updated',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
        });

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'action',
        id: createdConnector.id,
      });
    });

    it(`shouldn't update connector from another space`, async () => {
      const { body: createdConnector } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My connector',
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

      await supertest
        .put(`${getUrlPrefix(Spaces.other.id)}/api/actions/connector/${createdConnector.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My connector updated',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [action/${createdConnector.id}] not found`,
        });
    });

    it(`shouldn't update a preconfigured connector`, async () => {
      await supertest
        .put(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/custom-system-abc-connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My connector updated',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: `Preconfigured action custom-system-abc-connector can not be updated.`,
        });
    });

    it(`shouldn't update a system connector`, async () => {
      await supertest
        .put(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/actions/connector/system-connector-test.system-action`
        )
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My connector updated',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: 'System action system-connector-test.system-action can not be updated.',
        });
    });

    it('should notify feature usage when editing a gold connector type', async () => {
      const { body: createdConnector } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'Noop connector type',
          connector_type_id: 'test.noop',
          secrets: {},
          config: {},
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdConnector.id, 'connector', 'actions');

      const updateStart = new Date();
      await supertest
        .put(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/${createdConnector.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'Noop connector type updated',
          secrets: {},
          config: {},
        })
        .expect(200);

      const {
        body: { features },
      } = await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/api/licensing/feature_usage`);
      expect(features).to.be.an(Array);
      const noopFeature = features.find(
        (feature: { name: string }) => feature.name === 'Connector: Test: Noop'
      );
      expect(noopFeature).to.be.ok();
      expect(noopFeature.last_used).to.be.a('string');
      expect(new Date(noopFeature.last_used).getTime()).to.be.greaterThan(updateStart.getTime());
    });

    it('should handle update connector request appropriately when empty strings are submitted', async () => {
      await supertest
        .put(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/custom-system-abc-connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: ' ',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: `[request body.name]: value '' is not valid`,
        });
    });
  });
}

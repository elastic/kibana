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
export default function createConnectorTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('create', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should handle create connector request appropriately', async () => {
      const response = await supertest
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
        });

      expect(response.status).to.eql(200);
      objectRemover.add(Spaces.space1.id, response.body.id, 'connector', 'actions');
      expect(response.body).to.eql({
        id: response.body.id,
        is_preconfigured: false,
        is_deprecated: false,
        name: 'My connector',
        connector_type_id: 'test.index-record',
        is_missing_secrets: false,
        is_system_action: false,
        config: {
          unencrypted: `This value shouldn't get encrypted`,
        },
      });
      expect(typeof response.body.id).to.be('string');

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'action',
        id: response.body.id,
      });
    });

    it('should handle create connector request appropriately when empty strings are submitted', async () => {
      await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My connector',
          connector_type_id: 'test.index-record',
          config: {
            unencrypted: ' ',
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: `[request body.config.unencrypted]: value '' is not valid`,
        });
    });

    it(`shouldn't create a preconfigured connector with the same id as an existing one`, async () => {
      await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/custom-system-abc-connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My connector',
          connector_type_id: 'system-abc-action-type',
          config: {},
          secrets: {},
        })
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: 'This custom-system-abc-connector already exists in a preconfigured action.',
        });
    });

    it(`shouldn't create a system action`, async () => {
      await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My system action',
          connector_type_id: 'test.system-action',
          config: {},
          secrets: {},
        })
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: 'System action creation is forbidden. Action type: test.system-action.',
        });
    });

    it('should notify feature usage when creating a gold connector type', async () => {
      const testStart = new Date();
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'Noop connector type',
          connector_type_id: 'test.noop',
          secrets: {},
          config: {},
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, response.body.id, 'connector', 'actions');

      const {
        body: { features },
      } = await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/api/licensing/feature_usage`);
      expect(features).to.be.an(Array);
      const noopFeature = features.find(
        (feature: { name: string }) => feature.name === 'Connector: Test: Noop'
      );
      expect(noopFeature).to.be.ok();
      expect(noopFeature.last_used).to.be.a('string');
      expect(new Date(noopFeature.last_used).getTime()).to.be.greaterThan(testStart.getTime());
    });
  });
}

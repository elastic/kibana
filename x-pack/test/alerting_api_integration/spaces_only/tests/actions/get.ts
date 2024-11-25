/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Spaces } from '../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function getConnectorTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('get', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    it('should handle get connector request appropriately', async () => {
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
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/${createdConnector.id}`)
        .expect(200, {
          id: createdConnector.id,
          is_preconfigured: false,
          is_deprecated: false,
          is_missing_secrets: false,
          is_system_action: false,
          connector_type_id: 'test.index-record',
          name: 'My connector',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
        });
    });

    it(`connector should't be acessible from another space`, async () => {
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
        .get(`${getUrlPrefix(Spaces.other.id)}/api/actions/connector/${createdConnector.id}`)
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [action/${createdConnector.id}] not found`,
        });
    });

    it('should handle get a preconfigured connector', async () => {
      await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/my-slack1`)
        .expect(200, {
          id: 'my-slack1',
          is_preconfigured: true,
          is_deprecated: false,
          is_system_action: false,
          connector_type_id: '.slack',
          name: 'Slack#xyz',
        });
    });

    it('should return 404 when trying to get a system connector', async () => {
      await supertest
        .get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/actions/connector/system-connector-test.system-action`
        )
        .expect(404);
    });

    it('should handle get a deprecated connector', async () => {
      await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/my-deprecated-servicenow`)
        .expect(200, {
          id: 'my-deprecated-servicenow',
          is_preconfigured: true,
          is_deprecated: true,
          is_system_action: false,
          connector_type_id: '.servicenow',
          name: 'ServiceNow#xyz',
        });

      await supertest
        .get(
          `${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/my-deprecated-servicenow-default`
        )
        .expect(200, {
          id: 'my-deprecated-servicenow-default',
          is_preconfigured: true,
          is_deprecated: true,
          is_system_action: false,
          connector_type_id: '.servicenow',
          name: 'ServiceNow#xyz',
        });
    });
  });
}

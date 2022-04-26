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
export default function getActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('get', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    it('should handle get action request appropriately', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
          connector_type_id: 'test.index-record',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

      await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/${createdAction.id}`)
        .expect(200, {
          id: createdAction.id,
          is_preconfigured: false,
          is_deprecated: false,
          is_missing_secrets: false,
          connector_type_id: 'test.index-record',
          name: 'My action',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
        });
    });

    it(`action should't be acessible from another space`, async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
          connector_type_id: 'test.index-record',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

      await supertest
        .get(`${getUrlPrefix(Spaces.other.id)}/api/actions/connector/${createdAction.id}`)
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [action/${createdAction.id}] not found`,
        });
    });

    it('should handle get action request from preconfigured list', async () => {
      await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/my-slack1`)
        .expect(200, {
          id: 'my-slack1',
          is_preconfigured: true,
          is_deprecated: false,
          connector_type_id: '.slack',
          name: 'Slack#xyz',
        });
    });

    it('should handle get action request for deprecated connectors from preconfigured list', async () => {
      await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector/my-deprecated-servicenow`)
        .expect(200, {
          id: 'my-deprecated-servicenow',
          is_preconfigured: true,
          is_deprecated: true,
          connector_type_id: '.servicenow',
          name: 'ServiceNow#xyz',
        });
    });

    describe('legacy', () => {
      it('should handle get action request appropriately', async () => {
        const { body: createdAction } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'My action',
            actionTypeId: 'test.index-record',
            config: {
              unencrypted: `This value shouldn't get encrypted`,
            },
            secrets: {
              encrypted: 'This value should be encrypted',
            },
          })
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

        await supertest
          .get(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action/${createdAction.id}`)
          .expect(200, {
            id: createdAction.id,
            isPreconfigured: false,
            isDeprecated: false,
            actionTypeId: 'test.index-record',
            isMissingSecrets: false,
            name: 'My action',
            config: {
              unencrypted: `This value shouldn't get encrypted`,
            },
          });
      });

      it(`action should't be acessible from another space`, async () => {
        const { body: createdAction } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'My action',
            actionTypeId: 'test.index-record',
            config: {
              unencrypted: `This value shouldn't get encrypted`,
            },
            secrets: {
              encrypted: 'This value should be encrypted',
            },
          })
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

        await supertest
          .get(`${getUrlPrefix(Spaces.other.id)}/api/actions/action/${createdAction.id}`)
          .expect(404, {
            statusCode: 404,
            error: 'Not Found',
            message: `Saved object [action/${createdAction.id}] not found`,
          });
      });

      it('should handle get action request from preconfigured list', async () => {
        await supertest
          .get(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action/my-slack1`)
          .expect(200, {
            id: 'my-slack1',
            isPreconfigured: true,
            isDeprecated: false,
            actionTypeId: '.slack',
            name: 'Slack#xyz',
          });
      });
    });
  });
}

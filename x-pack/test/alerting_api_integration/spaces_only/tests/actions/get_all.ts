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
export default function getAllActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('getAll', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    it('should handle get all action request appropriately', async () => {
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

      await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connectors`).expect(200, [
        {
          id: createdAction.id,
          is_preconfigured: false,
          name: 'My action',
          connector_type_id: 'test.index-record',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          referenced_by_count: 0,
        },
        {
          id: 'preconfigured-es-index-action',
          is_preconfigured: true,
          connector_type_id: '.index',
          name: 'preconfigured_es_index_action',
          referenced_by_count: 0,
        },
        {
          id: 'my-slack1',
          is_preconfigured: true,
          connector_type_id: '.slack',
          name: 'Slack#xyz',
          referenced_by_count: 0,
        },
        {
          id: 'custom-system-abc-connector',
          is_preconfigured: true,
          connector_type_id: 'system-abc-action-type',
          name: 'SystemABC',
          referenced_by_count: 0,
        },
        {
          id: 'preconfigured.test.index-record',
          is_preconfigured: true,
          connector_type_id: 'test.index-record',
          name: 'Test:_Preconfigured_Index_Record',
          referenced_by_count: 0,
        },
      ]);
    });

    it(`shouldn't get all action from another space`, async () => {
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

      await supertest.get(`${getUrlPrefix(Spaces.other.id)}/api/actions/connectors`).expect(200, [
        {
          id: 'preconfigured-es-index-action',
          is_preconfigured: true,
          connector_type_id: '.index',
          name: 'preconfigured_es_index_action',
          referenced_by_count: 0,
        },
        {
          id: 'my-slack1',
          is_preconfigured: true,
          connector_type_id: '.slack',
          name: 'Slack#xyz',
          referenced_by_count: 0,
        },
        {
          id: 'custom-system-abc-connector',
          is_preconfigured: true,
          connector_type_id: 'system-abc-action-type',
          name: 'SystemABC',
          referenced_by_count: 0,
        },
        {
          id: 'preconfigured.test.index-record',
          is_preconfigured: true,
          connector_type_id: 'test.index-record',
          name: 'Test:_Preconfigured_Index_Record',
          referenced_by_count: 0,
        },
      ]);
    });

    describe('legacy', () => {
      it('should handle get all action request appropriately', async () => {
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

        await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/api/actions`).expect(200, [
          {
            id: createdAction.id,
            isPreconfigured: false,
            name: 'My action',
            actionTypeId: 'test.index-record',
            config: {
              unencrypted: `This value shouldn't get encrypted`,
            },
            referencedByCount: 0,
          },
          {
            id: 'preconfigured-es-index-action',
            isPreconfigured: true,
            actionTypeId: '.index',
            name: 'preconfigured_es_index_action',
            referencedByCount: 0,
          },
          {
            id: 'my-slack1',
            isPreconfigured: true,
            actionTypeId: '.slack',
            name: 'Slack#xyz',
            referencedByCount: 0,
          },
          {
            id: 'custom-system-abc-connector',
            isPreconfigured: true,
            actionTypeId: 'system-abc-action-type',
            name: 'SystemABC',
            referencedByCount: 0,
          },
          {
            id: 'preconfigured.test.index-record',
            isPreconfigured: true,
            actionTypeId: 'test.index-record',
            name: 'Test:_Preconfigured_Index_Record',
            referencedByCount: 0,
          },
        ]);
      });
    });
  });
}

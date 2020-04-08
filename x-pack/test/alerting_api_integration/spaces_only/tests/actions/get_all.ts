/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action`)
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
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action');

      await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/api/action/_getAll`).expect(200, [
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
          id: 'my-slack1',
          isPreconfigured: true,
          actionTypeId: '.slack',
          name: 'Slack#xyz',
          config: {
            webhookUrl: 'https://hooks.slack.com/services/abcd/efgh/ijklmnopqrstuvwxyz',
          },
          referencedByCount: 0,
        },
        {
          id: 'custom-system-abc-connector',
          isPreconfigured: true,
          actionTypeId: 'system-abc-action-type',
          name: 'SystemABC',
          config: {
            xyzConfig1: 'value1',
            xyzConfig2: 'value2',
            listOfThings: ['a', 'b', 'c', 'd'],
          },
          referencedByCount: 0,
        },
      ]);
    });

    it(`shouldn't get all action from another space`, async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action`)
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
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action');

      await supertest.get(`${getUrlPrefix(Spaces.other.id)}/api/action/_getAll`).expect(200, [
        {
          id: 'my-slack1',
          isPreconfigured: true,
          actionTypeId: '.slack',
          name: 'Slack#xyz',
          config: {
            webhookUrl: 'https://hooks.slack.com/services/abcd/efgh/ijklmnopqrstuvwxyz',
          },
          referencedByCount: 0,
        },
        {
          id: 'custom-system-abc-connector',
          isPreconfigured: true,
          actionTypeId: 'system-abc-action-type',
          name: 'SystemABC',
          config: {
            xyzConfig1: 'value1',
            xyzConfig2: 'value2',
            listOfThings: ['a', 'b', 'c', 'd'],
          },
          referencedByCount: 0,
        },
      ]);
    });
  });
}

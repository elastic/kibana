/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RuleActionTypes } from '@kbn/alerting-plugin/common';
import { omit } from 'lodash';
import { Spaces } from '../../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createUpdateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('bulkEdit', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    describe('system actions', () => {
      const systemAction = {
        id: 'system-connector-test.system-action',
        uuid: '123',
        params: {},
        type: RuleActionTypes.SYSTEM,
      };

      it('should bulk edit system actions correctly', async () => {
        const { body: rule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(Spaces.space1.id, rule.id, 'rule', 'alerting');

        const payload = {
          ids: [rule.id],
          operations: [
            {
              operation: 'add',
              field: 'actions',
              value: [systemAction],
            },
          ],
        };

        const res = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
          .set('kbn-xsrf', 'foo')
          .send(payload)
          .expect(200);

        expect(res.body.rules[0].actions).to.eql([
          {
            id: 'system-connector-test.system-action',
            connector_type_id: 'test.system-action',
            params: {},
            uuid: '123',
            type: RuleActionTypes.SYSTEM,
          },
        ]);
      });

      it('should throw 400 if the system action is missing required properties', async () => {
        const { body: rule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(Spaces.space1.id, rule.id, 'rule', 'alerting');

        for (const propertyToOmit of ['id', 'uuid']) {
          const systemActionWithoutProperty = omit(systemAction, propertyToOmit);

          const payload = {
            ids: [rule.id],
            operations: [
              {
                operation: 'add',
                field: 'actions',
                value: [systemActionWithoutProperty],
              },
            ],
          };

          await supertest
            .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
            .set('kbn-xsrf', 'foo')
            .send(payload)
            .expect(400);
        }
      });

      it('should throw 400 if the system action contain properties from the default actions', async () => {
        const { body: rule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(Spaces.space1.id, rule.id, 'rule', 'alerting');

        for (const propertyAdd of [
          { group: 'test' },
          {
            frequency: {
              notify_when: 'onThrottleInterval' as const,
              summary: true,
              throttle: '1h',
            },
          },
          {
            alerts_filter: {
              query: { dsl: '{test:1}', kql: 'test:1s', filters: [] },
            },
          },
        ]) {
          const payload = {
            ids: [rule.id],
            operations: [
              {
                operation: 'add',
                field: 'actions',
                value: [{ ...systemAction, ...propertyAdd }],
              },
            ],
          };

          await supertest
            .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
            .set('kbn-xsrf', 'foo')
            .send(payload)
            .expect(400);
        }
      });

      it('should throw 400 if the system action is missing required params', async () => {
        const { body: rule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);

        objectRemover.add(Spaces.space1.id, rule.id, 'rule', 'alerting');

        const payload = {
          ids: [rule.id],
          operations: [
            {
              operation: 'add',
              field: 'actions',
              value: [
                {
                  ...systemAction,
                  params: {},
                  id: 'system-connector-test.system-action-connector-adapter',
                },
              ],
            },
          ],
        };

        const res = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_bulk_edit`)
          .set('kbn-xsrf', 'foo')
          .send(payload)
          .expect(200);

        expect(res.body.errors[0].message).to.eql(
          'Invalid system action params. System action type: test.system-action-connector-adapter - [myParam]: expected value of type [string] but got [undefined]'
        );
      });
    });
  });
}

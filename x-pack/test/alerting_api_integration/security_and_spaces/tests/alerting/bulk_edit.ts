/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
import { checkAAD, getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createUpdateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('bulkEdit', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle bulk edit of alerts appropriately', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'MY action',
              connector_type_id: 'test.noop',
              config: {},
              secrets: {},
            })
            .expect(200);

          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData({ tags: ['foo'] }))
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const payload = {
            ids: [createdAlert.id],
            editActions: [
              {
                action: 'add',
                field: 'actions',
                value: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                ],
              },
            ],
          };
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_bulk_edit`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(payload);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to find rules for any rule types',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'global_read at space1':
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Unauthorized to bulkEdit a "test.noop" rule for "alertsFixture"',
                statusCode: 403,
              });
              expect(response.statusCode).to.eql(403);
              break;
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.body).to.eql({
                errors: [
                  {
                    message: 'Unauthorized to get actions',
                    rule: {
                      id: createdAlert.id,
                      name: 'abc',
                    },
                  },
                ],
                rules: [],
              });
              expect(response.statusCode).to.eql(200);
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body.rules[0].actions).to.eql([
                {
                  id: createdAction.id,
                  group: 'default',
                  params: {},
                  connector_type_id: 'test.noop',
                },
              ]);
              expect(response.statusCode).to.eql(200);
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: 'alert',
                id: createdAlert.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}

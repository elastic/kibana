/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../scenarios';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { AlertUtils, getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function retainAPIKeyTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('retain api key', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      const alertUtils = new AlertUtils({ user, space, supertestWithoutAuth });

      describe(scenario.id, () => {
        it('should retain the api key when a rule is disabled and then enabled', async () => {
          const { body: createdConnector } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'MY connector',
              connector_type_id: 'test.noop',
              config: {},
              secrets: {},
            })
            .expect(200);

          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                actions: [
                  {
                    id: createdConnector.id,
                    group: 'default',
                    params: {},
                  },
                ],
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');
          objectRemover.add(space.id, createdConnector.id, 'connector', 'actions');
          const {
            body: { apiKey, apiKeyOwner },
          } = await alertUtils.getAPIKeyRequest(createdRule.id);

          expect(apiKey).not.to.be(null);
          expect(apiKey).not.to.be(undefined);
          expect(apiKeyOwner).not.to.be(null);
          expect(apiKeyOwner).not.to.be(undefined);

          await alertUtils.getDisableRequest(createdRule.id);

          const {
            body: { apiKey: apiKeyAfterDisable, apiKeyOwner: apiKeyOwnerAfterDisable },
          } = await alertUtils.getAPIKeyRequest(createdRule.id);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(apiKey).to.be(apiKeyAfterDisable);
              expect(apiKeyOwner).to.be(apiKeyOwnerAfterDisable);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }

          await alertUtils.getEnableRequest(createdRule.id);

          const {
            body: { apiKey: apiKeyAfterEnable, apiKeyOwner: apiKeyOwnerAfterEnable },
          } = await alertUtils.getAPIKeyRequest(createdRule.id);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(apiKey).to.be(apiKeyAfterEnable);
              expect(apiKeyOwner).to.be(apiKeyOwnerAfterEnable);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}

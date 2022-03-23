/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  AlertUtils,
  ESTestIndexTool,
  ES_TEST_INDEX_NAME,
} from '../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function createFindTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('health', () => {
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });

    after(async () => {
      await esTestIndexTool.destroy();
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;

      describe(scenario.id, () => {
        let alertUtils: AlertUtils;
        let indexRecordActionId: string;

        before(async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
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
          indexRecordActionId = createdAction.id;
          objectRemover.add(space.id, indexRecordActionId, 'connector', 'actions');

          alertUtils = new AlertUtils({
            user,
            space,
            supertestWithoutAuth,
            indexRecordActionId,
            objectRemover,
          });
        });

        after(() => objectRemover.removeAll());

        it('should return healthy status by default', async () => {
          const { body: health } = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/api/alerting/_health`)
            .auth(user.username, user.password);
          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(health).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to access alerting framework health',
              });
              break;
            default:
              expect(health.is_sufficiently_secure).to.eql(true);
              expect(health.has_permanent_encryption_key).to.eql(true);
              expect(health.alerting_framework_health.decryption_health.status).to.eql('ok');
              expect(health.alerting_framework_health.execution_health.status).to.eql('ok');
              expect(health.alerting_framework_health.read_health.status).to.eql('ok');
              // Legacy: pre-v8.0 typo
              expect(health.alerting_framework_heath.decryption_health.status).to.eql('ok');
              expect(health.alerting_framework_heath.execution_health.status).to.eql('ok');
              expect(health.alerting_framework_heath.read_health.status).to.eql('ok');
          }
        });

        it('should return error when a rule in the default space is failing', async () => {
          const reference = alertUtils.generateReference();
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                schedule: {
                  interval: '5m',
                },
                rule_type_id: 'test.failing',
                params: {
                  index: ES_TEST_INDEX_NAME,
                  reference,
                },
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

          const ruleInErrorStatus = await retry.tryForTime(30000, async () => {
            const { body: rule } = await supertest
              .get(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdRule.id}`)
              .expect(200);
            expect(rule.execution_status.status).to.eql('error');
            return rule;
          });

          await retry.tryForTime(30000, async () => {
            const { body: health } = await supertestWithoutAuth
              .get(`${getUrlPrefix(space.id)}/api/alerting/_health`)
              .auth(user.username, user.password);

            switch (scenario.id) {
              case 'no_kibana_privileges at space1':
              case 'space_1_all at space2':
                expect(health).to.eql({
                  statusCode: 403,
                  error: 'Forbidden',
                  message: 'Unauthorized to access alerting framework health',
                });
                break;
              default:
                expect(health.alerting_framework_health.execution_health.status).to.eql('warn');
                expect(health.alerting_framework_health.execution_health.timestamp).to.eql(
                  ruleInErrorStatus.execution_status.last_execution_date
                );
                // Legacy: pre-v8.0 typo
                expect(health.alerting_framework_heath.execution_health.status).to.eql('warn');
                expect(health.alerting_framework_heath.execution_health.timestamp).to.eql(
                  ruleInErrorStatus.execution_status.last_execution_date
                );
            }
          });
        });
      });
    }
  });
}

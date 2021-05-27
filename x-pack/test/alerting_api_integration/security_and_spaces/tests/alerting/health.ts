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
  getTestAlertData,
  ObjectRemover,
  AlertUtils,
  ESTestIndexTool,
  ES_TEST_INDEX_NAME,
} from '../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function createFindTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe.only('health', () => {
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
          const { body: health } = await supertest.get(
            `${getUrlPrefix(space.id)}/api/alerting/_health`
          );
          console.log('health', health);
          expect(health.is_sufficiently_secure).to.eql(true);
          expect(health.has_permanent_encryption_key).to.eql(true);
          expect(health.alerting_framework_heath.decryption_health.status).to.eql('ok');
          expect(health.alerting_framework_heath.execution_health.status).to.eql('ok');
          expect(health.alerting_framework_heath.read_health.status).to.eql('ok');
        });

        it('should return error when a rule in the default space is failing', async () => {
          const reference = alertUtils.generateReference();
          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                rule_type_id: 'test.failing',
                params: {
                  index: ES_TEST_INDEX_NAME,
                  reference,
                },
              })
            )
            .expect(200);
          objectRemover.add(space.id, response.body.id, 'rule', 'alerting');

          console.log('RESP', response.body);
        });
      });
    }
  });
}

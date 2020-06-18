/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  AlertUtils,
  checkAAD,
  getUrlPrefix,
  getTestAlertData,
  ObjectRemover,
} from '../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function createMuteAlertInstanceTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('unmute_instance', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      const alertUtils = new AlertUtils({ user, space, supertestWithoutAuth });

      describe(scenario.id, () => {
        it('should handle unmute alert instance request appropriately', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerts/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData({ enabled: false }))
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'alert', 'alerts');

          await supertest
            .post(
              `${getUrlPrefix(space.id)}/api/alerts/alert/${createdAlert.id}/alert_instance/1/_mute`
            )
            .set('kbn-xsrf', 'foo')
            .expect(204, '');

          const response = await alertUtils.getUnmuteInstanceRequest(createdAlert.id, '1');

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              const { body: updatedAlert } = await supertestWithoutAuth
                .get(`${getUrlPrefix(space.id)}/api/alerts/alert/${createdAlert.id}`)
                .set('kbn-xsrf', 'foo')
                .auth(user.username, user.password)
                .expect(200);
              expect(updatedAlert.mutedInstanceIds).to.eql([]);
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

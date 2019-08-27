/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getTestAlertData } from './utils';
import { UserAtSpaceScenarios } from '../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createFindTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('find', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle find alert request appropriately', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'alert');

          const response = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(space.id)}/api/alert/_find?search=test.noop&search_fields=alertTypeId`
            )
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.page).to.equal(1);
              expect(response.body.perPage).to.be.greaterThan(0);
              expect(response.body.total).to.be.greaterThan(0);
              const match = response.body.data.find((obj: any) => obj.id === createdAlert.id);
              expect(match).to.eql({
                id: createdAlert.id,
                alertTypeId: 'test.noop',
                interval: '10s',
                enabled: true,
                actions: [],
                alertTypeParams: {},
                createdBy: 'elastic',
                scheduledTaskId: match.scheduledTaskId,
                updatedBy: 'elastic',
                apiKeyOwner: 'elastic',
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

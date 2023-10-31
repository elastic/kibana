/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function deleteMaintenanceWindowTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('deleteMaintenanceWindow', () => {
    const objectRemover = new ObjectRemover(supertest);
    const createParams = {
      title: 'test-maintenance-window',
      duration: 60 * 60 * 1000, // 1 hr
      r_rule: {
        dtstart: new Date().toISOString(),
        tzid: 'UTC',
        freq: 2, // weekly
      },
    };
    afterEach(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle delete maintenance window request appropriately', async () => {
          const { body: maintenanceWindowBody } = await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send(createParams);

          const response = await supertestWithoutAuth
            .delete(
              `${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window/${
                maintenanceWindowBody.id
              }`
            )
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Forbidden',
                statusCode: 403,
              });
              objectRemover.add(
                space.id,
                maintenanceWindowBody.id,
                'rules/maintenance_window',
                'alerting',
                true
              );
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(204);

              const getResponse = await supertest
                .get(
                  `${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window/${
                    maintenanceWindowBody.id
                  }`
                )
                .set('kbn-xsrf', 'foo');

              expect(getResponse.body.statusCode).to.eql(404);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}

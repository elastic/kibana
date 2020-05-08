/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
import { getUrlPrefix } from '../../../common/lib/space_test_utils';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function listActionTypesTests({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('list_action_types', () => {
    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should return 200 with list of action types containing defaults', async () => {
          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/api/actions/list_action_types`)
            .auth(user.username, user.password);

          function createActionTypeMatcher(id: string, name: string) {
            return (actionType: { id: string; name: string }) => {
              return actionType.id === id && actionType.name === name;
            };
          }

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
              // Check for values explicitly in order to avoid this test failing each time plugins register
              // a new action type
              expect(
                response.body.some(
                  createActionTypeMatcher('test.index-record', 'Test: Index Record')
                )
              ).to.be(true);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  superUser,
  obsOnlySpacesAll,
  secOnlyRead,
  stackAlertsOnlyReadSpacesAll,
} from '../../../common/lib/authentication/users';
import type { User } from '../../../common/lib/authentication/types';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getSpaceUrlPrefix } from '../../../common/lib/authentication/spaces';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const TEST_URL = '/internal/rac/alerts';
  const ALERTS_INDEX_URL = `${TEST_URL}/index`;
  const SPACE1 = 'space1';
  const APM_ALERT_INDEX = '.alerts-observability.apm.alerts-default';
  const SECURITY_SOLUTION_ALERT_INDEX = '.alerts-security.alerts';
  const STACK_ALERT_INDEX = '.alerts-stack.alerts-default';

  const getIndexName = async (
    ruleTypeIds: string[],
    user: User,
    space: string,
    expectedStatusCode: number = 200
  ) => {
    const resp = await supertestWithoutAuth
      .get(`${getSpaceUrlPrefix(space)}${ALERTS_INDEX_URL}`)
      .query({ ruleTypeIds })
      .auth(user.username, user.password)
      .set('kbn-xsrf', 'true')
      .expect(expectedStatusCode);

    return resp.body.index_name as string[];
  };

  describe('Alert - Get Index - RBAC - spaces', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    before(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
    });

    describe('Users:', () => {
      it(`${obsOnlySpacesAll.username} should be able to access the APM alert in ${SPACE1}`, async () => {
        const indexNames = await getIndexName(['apm.error_rate'], obsOnlySpacesAll, SPACE1);
        expect(indexNames.includes(APM_ALERT_INDEX)).to.eql(true); // assert this here so we can use constants in the dynamically-defined test cases below
      });

      it(`${superUser.username} should be able to access the APM alert in ${SPACE1}`, async () => {
        const indexNames = await getIndexName(['apm.error_rate'], superUser, SPACE1);
        expect(indexNames.includes(APM_ALERT_INDEX)).to.eql(true); // assert this here so we can use constants in the dynamically-defined test cases below
      });

      it(`${secOnlyRead.username} should NOT be able to access the APM alert in ${SPACE1}`, async () => {
        const indexNames = await getIndexName(['apm.error_rate'], secOnlyRead, SPACE1);
        expect(indexNames?.length).to.eql(0);
      });

      it(`${secOnlyRead.username} should be able to access the security solution alert in ${SPACE1}`, async () => {
        const indexNames = await getIndexName(['siem.esqlRule'], secOnlyRead, SPACE1);
        expect(indexNames.includes(`${SECURITY_SOLUTION_ALERT_INDEX}-${SPACE1}`)).to.eql(true); // assert this here so we can use constants in the dynamically-defined test cases below
      });

      it(`${stackAlertsOnlyReadSpacesAll.username} should be able to access the stack alert in ${SPACE1}`, async () => {
        const indexNames = await getIndexName(['.es-query'], stackAlertsOnlyReadSpacesAll, SPACE1);
        expect(indexNames.includes(STACK_ALERT_INDEX)).to.eql(true);
      });
    });
  });
};

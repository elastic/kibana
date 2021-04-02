/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import {
  ConnectorTypes,
  ConnectorJiraTypeFields,
} from '../../../../../../plugins/cases/common/api';
import {
  getPostCaseRequest,
  postCaseResp,
  removeServerGeneratedPropertiesFromCase,
} from '../../../../common/lib/mock';
import { createCaseAsUser, deleteCases } from '../../../../common/lib/utils';
import {
  secOnly,
  secOnlyRead,
  globalRead,
  obsOnlyRead,
  obsSecRead,
  noKibanaPrivileges,
} from '../../../../common/lib/authentication/users';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('post_case', () => {
    afterEach(async () => {
      await deleteCases(es);
    });

    it('should post a case', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(getPostCaseRequest())
        .expect(200);

      const data = removeServerGeneratedPropertiesFromCase(postedCase);
      expect(data).to.eql(postCaseResp(postedCase.id));
    });

    it('unhappy path - 400s when bad query supplied', async () => {
      await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        // @ts-expect-error
        .send({ ...getPostCaseRequest({ badKey: true }) })
        .expect(400);
    });

    it('unhappy path - 400s when connector is not supplied', async () => {
      const { connector, ...caseWithoutConnector } = getPostCaseRequest();

      await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(caseWithoutConnector)
        .expect(400);
    });

    it('unhappy path - 400s when connector has wrong type', async () => {
      await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          ...getPostCaseRequest({
            // @ts-expect-error
            connector: { id: 'wrong', name: 'wrong', type: '.not-exists', fields: null },
          }),
        })
        .expect(400);
    });

    it('unhappy path - 400s when connector has wrong fields', async () => {
      await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          ...getPostCaseRequest({
            // @ts-expect-error
            connector: {
              id: 'wrong',
              name: 'wrong',
              type: ConnectorTypes.jira,
              fields: { unsupported: 'value' },
            } as ConnectorJiraTypeFields,
          }),
        })
        .expect(400);
    });

    describe('rbac', () => {
      it('User: security solution only - should create a case', async () => {
        const theCase = await createCaseAsUser({
          supertestWithoutAuth,
          user: secOnly,
          space: 'space1',
          owner: 'securitySolutionFixture',
        });
        expect(theCase.owner).to.eql('securitySolutionFixture');
      });

      it('User: security solution only - should NOT create a case of different owner', async () => {
        await createCaseAsUser({
          supertestWithoutAuth,
          user: secOnly,
          space: 'space1',
          owner: 'observabilityFixture',
          expectedHttpCode: 403,
        });
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should NOT create a case`, async () => {
          await createCaseAsUser({
            supertestWithoutAuth,
            user,
            space: 'space1',
            owner: 'securitySolutionFixture',
            expectedHttpCode: 403,
          });
        });
      }

      it('should NOT create a case in a space with no permissions', async () => {
        await createCaseAsUser({
          supertestWithoutAuth,
          user: secOnly,
          space: 'space2',
          owner: 'securitySolutionFixture',
          expectedHttpCode: 403,
        });
      });
    });
  });
};

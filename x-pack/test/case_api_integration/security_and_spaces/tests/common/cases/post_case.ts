/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { CASES_URL } from '../../../../../../plugins/cases/common/constants';
import {
  postCaseReq,
  postCaseResp,
  removeServerGeneratedPropertiesFromCase,
} from '../../../../common/lib/mock';
import { deleteCases, getSpaceUrlPrefix } from '../../../../common/lib/utils';
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
        .send(postCaseReq)
        .expect(200);

      const data = removeServerGeneratedPropertiesFromCase(postedCase);
      expect(data).to.eql(postCaseResp(postedCase.id));
    });

    it('unhappy path - 400s when bad query supplied', async () => {
      await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({ ...postCaseReq, badKey: true })
        .expect(400);
    });

    it('unhappy path - 400s when connector is not supplied', async () => {
      const { connector, ...caseWithoutConnector } = postCaseReq;

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
          ...postCaseReq,
          connector: { id: 'wrong', name: 'wrong', type: '.not-exists', fields: null },
        })
        .expect(400);
    });

    it('unhappy path - 400s when connector has wrong fields', async () => {
      await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          ...postCaseReq,
          connector: {
            id: 'wrong',
            name: 'wrong',
            type: '.jira',
            fields: { unsupported: 'value' },
          },
        })
        .expect(400);
    });

    describe('rbac', () => {
      it('User: security solution only - should create a case', async () => {
        const { body: theCase } = await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix('space1')}${CASES_URL}`)
          .auth(secOnly.username, secOnly.password)
          .set('kbn-xsrf', 'true')
          .send(postCaseReq)
          .expect(200);

        expect(theCase.scope).to.eql('securitySolutionFixture');
      });

      it('User: security solution only - should NOT create a case of different scope', async () => {
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix('space1')}${CASES_URL}`)
          .auth(secOnly.username, secOnly.password)
          .set('kbn-xsrf', 'true')
          .send({ ...postCaseReq, scope: 'observability' })
          .expect(403);
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should NOT create a case`, async () => {
          await supertestWithoutAuth
            .post(`${getSpaceUrlPrefix('space1')}${CASES_URL}`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'true')
            .send(postCaseReq)
            .expect(403);
        });
      }

      it('should NOT create a case in a space with no permissions', async () => {
        await supertestWithoutAuth
          .post(`${getSpaceUrlPrefix('space2')}${CASES_URL}`)
          .auth(secOnly.username, secOnly.password)
          .set('kbn-xsrf', 'true')
          .send(postCaseReq)
          .expect(403);
      });
    });
  });
};

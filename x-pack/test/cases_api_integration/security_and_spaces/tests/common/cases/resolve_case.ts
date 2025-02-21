/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { CASES_URL } from '@kbn/cases-plugin/common/constants';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseResp, getPostCaseRequest } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  resolveCase,
  removeServerGeneratedPropertiesFromCase,
} from '../../../../common/lib/api';
import {
  secOnly,
  obsOnly,
  globalRead,
  superUser,
  secOnlyRead,
  obsOnlyRead,
  obsSecRead,
  noKibanaPrivileges,
  obsSec,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('resolve_case', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should resolve a case', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      const resolvedCase = await resolveCase({
        supertest,
        caseId: postedCase.id,
      });

      const data = removeServerGeneratedPropertiesFromCase(resolvedCase.case);
      expect(data).to.eql(postCaseResp());
      expect(data.comments?.length).to.eql(0);
    });

    it('unhappy path - 404s when case is not there', async () => {
      await supertest
        .get(`${CASES_URL}/fake-id/resolve`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(404);
    });

    describe('rbac', () => {
      it('should resolve a case', async () => {
        const newCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space1',
          }
        );

        for (const user of [globalRead, superUser, secOnly, secOnlyRead, obsSec, obsSecRead]) {
          const resolvedCase = await resolveCase({
            supertest: supertestWithoutAuth,
            caseId: newCase.id,
            auth: { user, space: 'space1' },
          });

          expect(resolvedCase.case.owner).to.eql('securitySolutionFixture');
          expect(resolvedCase.outcome).to.eql('exactMatch');
          expect(resolvedCase.alias_target_id).to.eql(undefined);
        }
      });

      it('should not resolve a case when the user does not have access to owner', async () => {
        const newCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space1',
          }
        );

        for (const user of [noKibanaPrivileges, obsOnly, obsOnlyRead]) {
          await resolveCase({
            supertest: supertestWithoutAuth,
            caseId: newCase.id,
            expectedHttpCode: 403,
            auth: { user, space: 'space1' },
          });
        }
      });

      it('should NOT resolve a case in a space with no permissions', async () => {
        const newCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space2',
          }
        );

        await resolveCase({
          supertest: supertestWithoutAuth,
          caseId: newCase.id,
          expectedHttpCode: 403,
          auth: { user: secOnly, space: 'space2' },
        });
      });
    });
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import expect from '@kbn/expect';
import { CommentType } from '@kbn/cases-plugin/common';
import { getPostCaseRequest, postCaseReq } from '../../../../common/lib/mock';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  deleteAllCaseItems,
  bulkGetCases,
  createCase,
  createComment,
  ensureSavedObjectIsAuthorized,
} from '../../../../common/lib/utils';
import {
  secOnly,
  obsOnly,
  superUser,
  secOnlyRead,
  obsOnlyRead,
  obsSecRead,
  globalRead,
  noKibanaPrivileges,
  obsSec,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('bulk_get_cases', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('get', () => {
      it('should return the correct cases', async () => {
        const caseOne = await createCase(supertest, postCaseReq);
        const caseTwo = await createCase(supertest, postCaseReq);

        const { cases, errors } = await bulkGetCases({ supertest, ids: [caseOne.id, caseTwo.id] });

        expect(cases).to.eql([caseOne, caseTwo]);
        expect(errors.length).to.be(0);
      });

      it('should return the correct cases with specific fields', async () => {
        const caseOne = await createCase(supertest, postCaseReq);
        const caseTwo = await createCase(supertest, postCaseReq);

        const { cases, errors } = await bulkGetCases({
          supertest,
          ids: [caseOne.id, caseTwo.id],
          fields: ['title'],
        });

        const fieldsToPick = ['id', 'version', 'owner', 'title'];

        expect(cases).to.eql([pick(caseOne, fieldsToPick), pick(caseTwo, fieldsToPick)]);
        expect(errors.length).to.be(0);
      });

      it('should return only valid cases', async () => {
        const caseOne = await createCase(supertest, postCaseReq);

        const { cases, errors } = await bulkGetCases({ supertest, ids: [caseOne.id, 'not-exist'] });

        expect(cases).to.eql([caseOne]);
        expect(errors.length).to.be(1);
      });

      it('should return the correct counts', async () => {
        const caseOne = await createCase(supertest, postCaseReq);
        const caseTwo = await createCase(supertest, postCaseReq);

        await createComment({
          supertest,
          caseId: caseOne.id,
          params: {
            alertId: ['test-id-1', 'test-id-2'],
            index: ['test-index', 'test-index'],
            rule: { id: 'test-rule-id', name: 'test-index-id' },
            type: CommentType.alert,
            owner: 'securitySolutionFixture',
          },
        });

        const caseTwoUpdated = await createComment({
          supertest,
          caseId: caseTwo.id,
          params: {
            alertId: ['test-id-3'],
            index: ['test-index'],
            rule: { id: 'test-rule-id', name: 'test-index-id' },
            type: CommentType.alert,
            owner: 'securitySolutionFixture',
          },
        });

        const caseOneUpdated = await createComment({
          supertest,
          caseId: caseOne.id,
          params: {
            comment: 'a comment',
            type: CommentType.user,
            owner: 'securitySolutionFixture',
          },
        });

        const { cases, errors } = await bulkGetCases({
          supertest,
          ids: [caseOneUpdated.id, caseTwoUpdated.id],
        });

        /**
         * For performance reasons bulk_get does not
         * return the comments
         */
        expect(cases).to.eql([
          { ...caseOneUpdated, comments: [], totalComment: 1, totalAlerts: 2 },
          { ...caseTwoUpdated, comments: [], totalComment: 0, totalAlerts: 1 },
        ]);
        expect(errors.length).to.be(0);
      });
    });

    describe('errors', () => {
      it('400s when requesting invalid fields', async () => {
        const caseOne = await createCase(supertest, postCaseReq);

        await bulkGetCases({
          supertest,
          ids: [caseOne.id],
          fields: ['invalid'],
          expectedHttpCode: 400,
        });
      });

      it('400s when requesting more than 1000 cases', async () => {
        const ids = Array(1001).fill('test');

        await bulkGetCases({
          supertest,
          ids,
          expectedHttpCode: 400,
        });
      });

      it('should return saved object errors correctly', async () => {
        const caseOne = await createCase(supertest, postCaseReq);

        const { errors } = await bulkGetCases({ supertest, ids: [caseOne.id, 'not-exist'] });

        expect(errors.length).to.be(1);
        expect(errors[0]).to.eql({
          error: 'Not Found',
          message: 'Saved object [cases/not-exist] not found',
          status: 404,
          caseId: 'not-exist',
        });
      });
    });

    describe('rbac', () => {
      it('should return the correct cases', async () => {
        const [secCase, obsCase] = await Promise.all([
          // Create case owned by the security solution user
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          ),
          // Create case owned by the observability user
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          ),
        ]);

        const caseIds = [secCase.id, obsCase.id];

        for (const scenario of [
          {
            user: globalRead,
            numberOfExpectedCases: 2,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
            errors: { totals: 0, forCaseId: '', forOwner: '' },
          },
          {
            user: superUser,
            numberOfExpectedCases: 2,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
            errors: { totals: 0, forCaseId: '', forOwner: '' },
          },
          {
            user: secOnlyRead,
            numberOfExpectedCases: 1,
            owners: ['securitySolutionFixture'],
            errors: { totals: 1, forCaseId: obsCase.id, forOwner: obsCase.owner },
          },
          {
            user: obsOnlyRead,
            numberOfExpectedCases: 1,
            owners: ['observabilityFixture'],
            errors: { totals: 1, forCaseId: secCase.id, forOwner: secCase.owner },
          },
          {
            user: obsSecRead,
            numberOfExpectedCases: 2,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
            errors: { totals: 0, forCaseId: '', forOwner: '' },
          },
          {
            user: obsSec,
            numberOfExpectedCases: 2,
            owners: ['securitySolutionFixture', 'observabilityFixture'],
            errors: { totals: 0, forCaseId: '', forOwner: '' },
          },
          {
            user: secOnly,
            numberOfExpectedCases: 1,
            owners: ['securitySolutionFixture'],
            errors: { totals: 1, forCaseId: obsCase.id, forOwner: obsCase.owner },
          },
          {
            user: obsOnly,
            numberOfExpectedCases: 1,
            owners: ['observabilityFixture'],
            errors: { totals: 1, forCaseId: secCase.id, forOwner: secCase.owner },
          },
        ]) {
          const { cases, errors } = await bulkGetCases({
            supertest: supertestWithoutAuth,
            ids: caseIds,
            auth: { user: scenario.user, space: 'space1' },
          });

          ensureSavedObjectIsAuthorized(cases, scenario.numberOfExpectedCases, scenario.owners);
          expect(errors.length).to.be(scenario.errors.totals);

          if (scenario.errors.totals) {
            expect(errors[0]).to.eql({
              error: 'Forbidden',
              message: `Unauthorized to access case with owner: "${scenario.errors.forOwner}"`,
              status: 403,
              caseId: scenario.errors.forCaseId,
            });
          }
        }
      });

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: secOnly, space: 'space2' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should NOT bulk get cases`, async () => {
          // super user creates a case at the appropriate space
          const newCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: scenario.space,
            }
          );

          await bulkGetCases({
            supertest: supertestWithoutAuth,
            ids: [newCase.id],
            auth: {
              user: scenario.user,
              space: scenario.space,
            },
            expectedHttpCode: 403,
          });
        });
      }

      it('should get an empty array when the user does not have access to owner', async () => {
        const newCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space1',
          }
        );

        for (const user of [obsOnly, obsOnlyRead]) {
          const { cases, errors } = await bulkGetCases({
            supertest: supertestWithoutAuth,
            ids: [newCase.id],
            auth: { user, space: 'space1' },
          });

          expect(cases.length).to.be(0);
          expect(errors.length).to.be(1);

          expect(errors[0]).to.eql({
            error: 'Forbidden',
            message: 'Unauthorized to access case with owner: "securitySolutionFixture"',
            status: 403,
            caseId: newCase.id,
          });
        }
      });

      it('should NOT request the namespace field', async () => {
        const newCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200
        );

        await bulkGetCases({
          supertest: supertestWithoutAuth,
          ids: [newCase.id],
          fields: ['namespace'],
          expectedHttpCode: 400,
        });
      });
    });
  });
};

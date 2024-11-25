/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { APP_ID as CASES_APP_ID } from '@kbn/cases-plugin/common/constants';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { CaseStatuses, UserCommentAttachmentPayload } from '@kbn/cases-plugin/common/types/domain';
import { APP_ID as SECURITY_SOLUTION_APP_ID } from '@kbn/security-solution-plugin/common/constants';
import { observabilityFeatureId as OBSERVABILITY_APP_ID } from '@kbn/observability-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';

import {
  createCase,
  deleteAllCaseItems,
  deleteCases,
  getCase,
  createComment,
  updateCaseStatus,
} from '../../../cases_api_integration/common/lib/api';
import {
  casesAllUser,
  casesV2AllUser,
  casesNoDeleteUser,
  casesOnlyDeleteUser,
  obsCasesAllUser,
  obsCasesV2AllUser,
  obsCasesNoDeleteUser,
  obsCasesOnlyDeleteUser,
  secAllCasesNoDeleteUser,
  secAllCasesNoneUser,
  secAllCasesOnlyDeleteUser,
  secAllCasesReadUser,
  secAllUser,
  secCasesV2AllUser,
  secReadCasesAllUser,
  secReadCasesNoneUser,
  secReadCasesReadUser,
  secReadUser,
  casesV2NoReopenWithCreateCommentUser,
  casesV2NoCreateCommentWithReopenUser,
  obsCasesV2NoReopenWithCreateCommentUser,
  obsCasesV2NoCreateCommentWithReopenUser,
  secCasesV2NoReopenWithCreateCommentUser,
  secCasesV2NoCreateCommentWithReopenUser,
} from './common/users';
import { getPostCaseRequest } from '../../../cases_api_integration/common/lib/mock';

export default ({ getService }: FtrProviderContext): void => {
  describe('feature privilege', () => {
    const es = getService('es');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const supertest = getService('supertest');

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    for (const { user, owner } of [
      { user: secAllUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: secCasesV2AllUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: secReadCasesAllUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: casesAllUser, owner: CASES_APP_ID },
      { user: casesV2AllUser, owner: CASES_APP_ID },
      { user: casesNoDeleteUser, owner: CASES_APP_ID },
      { user: obsCasesAllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV2AllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesNoDeleteUser, owner: OBSERVABILITY_APP_ID },
    ]) {
      it(`User ${user.username} with role(s) ${user.roles.join()} can create a case`, async () => {
        await createCase(supertestWithoutAuth, getPostCaseRequest({ owner }), 200, {
          user,
          space: null,
        });
      });
    }

    for (const { user, owner } of [
      { user: secAllCasesReadUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: secReadCasesAllUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: secReadCasesReadUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: secReadUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: casesAllUser, owner: CASES_APP_ID },
      { user: casesV2AllUser, owner: CASES_APP_ID },
      { user: casesNoDeleteUser, owner: CASES_APP_ID },
      { user: obsCasesAllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV2AllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesNoDeleteUser, owner: OBSERVABILITY_APP_ID },
    ]) {
      it(`User ${user.username} with role(s) ${user.roles.join()} can get a case`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner }));
        const retrievedCase = await getCase({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          expectedHttpCode: 200,
          auth: { user, space: null },
        });

        expect(caseInfo.owner).to.eql(retrievedCase.owner);
      });
    }

    for (const { user, owner } of [
      { user: secAllCasesReadUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: secAllCasesNoneUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: secReadCasesReadUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: secReadUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: secReadCasesNoneUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: casesOnlyDeleteUser, owner: CASES_APP_ID },
      { user: obsCasesOnlyDeleteUser, owner: OBSERVABILITY_APP_ID },
    ]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} cannot create a case`, async () => {
        await createCase(supertestWithoutAuth, getPostCaseRequest({ owner }), 403, {
          user,
          space: null,
        });
      });
    }

    for (const { user, owner } of [
      { user: secAllCasesNoneUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: secReadCasesNoneUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: secAllCasesOnlyDeleteUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: casesOnlyDeleteUser, owner: CASES_APP_ID },
      { user: obsCasesOnlyDeleteUser, owner: OBSERVABILITY_APP_ID },
    ]) {
      it(`User ${user.username} with role(s) ${user.roles.join()} cannot get a case`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner }));

        await getCase({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          expectedHttpCode: 403,
          auth: { user, space: null },
        });
      });
    }

    for (const { user, owner } of [
      { user: secAllUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: secCasesV2AllUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: secAllCasesOnlyDeleteUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: casesAllUser, owner: CASES_APP_ID },
      { user: casesV2AllUser, owner: CASES_APP_ID },
      { user: casesOnlyDeleteUser, owner: CASES_APP_ID },
      { user: obsCasesAllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV2AllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesOnlyDeleteUser, owner: OBSERVABILITY_APP_ID },
    ]) {
      it(`User ${user.username} with role(s) ${user.roles.join()} can delete a case`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner }));
        await deleteCases({
          caseIDs: [caseInfo.id],
          supertest: supertestWithoutAuth,
          expectedHttpCode: 204,
          auth: { user, space: null },
        });
      });
    }

    for (const { user, owner } of [
      { user: secAllCasesReadUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: secAllCasesNoDeleteUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: casesNoDeleteUser, owner: CASES_APP_ID },
      { user: obsCasesNoDeleteUser, owner: OBSERVABILITY_APP_ID },
    ]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} cannot delete a case`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner }));
        await deleteCases({
          caseIDs: [caseInfo.id],
          supertest: supertestWithoutAuth,
          expectedHttpCode: 403,
          auth: { user, space: null },
        });
      });
    }

    for (const { user, owner } of [
      { user: secAllUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: secCasesV2AllUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: obsCasesAllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV2AllUser, owner: OBSERVABILITY_APP_ID },
      { user: casesAllUser, owner: CASES_APP_ID },
      { user: casesV2AllUser, owner: CASES_APP_ID },
      { user: casesV2NoCreateCommentWithReopenUser, owner: CASES_APP_ID },
      { user: obsCasesV2NoCreateCommentWithReopenUser, owner: OBSERVABILITY_APP_ID },
      { user: secCasesV2NoCreateCommentWithReopenUser, owner: SECURITY_SOLUTION_APP_ID },
    ]) {
      it(`User ${user.username} with role(s) ${user.roles.join()} can reopen a case`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner }));
        await updateCaseStatus({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          status: 'closed' as CaseStatuses,
          version: '2',
          expectedHttpCode: 200,
          auth: { user, space: null },
        });

        await updateCaseStatus({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          status: 'open' as CaseStatuses,
          version: '3',
          expectedHttpCode: 200,
          auth: { user, space: null },
        });
      });
    }

    for (const { user, owner } of [
      { user: casesV2NoReopenWithCreateCommentUser, owner: CASES_APP_ID },
      { user: obsCasesV2NoReopenWithCreateCommentUser, owner: OBSERVABILITY_APP_ID },
      { user: secCasesV2NoReopenWithCreateCommentUser, owner: SECURITY_SOLUTION_APP_ID },
    ]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} CANNOT reopen a case`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner }));
        await updateCaseStatus({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          status: 'closed' as CaseStatuses,
          version: '2',
          expectedHttpCode: 200,
          auth: { user, space: null },
        });

        await updateCaseStatus({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          status: 'open' as CaseStatuses,
          version: '3',
          expectedHttpCode: 403,
          auth: { user, space: null },
        });
      });
    }

    for (const { user, owner } of [
      { user: secAllUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: secCasesV2AllUser, owner: SECURITY_SOLUTION_APP_ID },
      { user: obsCasesAllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV2AllUser, owner: OBSERVABILITY_APP_ID },
      { user: casesAllUser, owner: CASES_APP_ID },
      { user: casesV2AllUser, owner: CASES_APP_ID },
      { user: casesV2NoReopenWithCreateCommentUser, owner: CASES_APP_ID },
      { user: obsCasesV2NoReopenWithCreateCommentUser, owner: OBSERVABILITY_APP_ID },
      { user: secCasesV2NoReopenWithCreateCommentUser, owner: SECURITY_SOLUTION_APP_ID },
    ]) {
      it(`User ${user.username} with role(s) ${user.roles.join()} can add comments`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner }));
        const comment: UserCommentAttachmentPayload = {
          comment: 'test',
          owner,
          type: AttachmentType.user,
        };
        await createComment({
          params: comment,
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          expectedHttpCode: 200,
          auth: { user, space: null },
        });
      });
    }

    for (const { user, owner } of [
      { user: casesV2NoCreateCommentWithReopenUser, owner: CASES_APP_ID },
      { user: obsCasesV2NoCreateCommentWithReopenUser, owner: OBSERVABILITY_APP_ID },
      { user: secCasesV2NoCreateCommentWithReopenUser, owner: SECURITY_SOLUTION_APP_ID },
    ]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} CANNOT add comments`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner }));
        const comment: UserCommentAttachmentPayload = {
          comment: 'test',
          owner,
          type: AttachmentType.user,
        };
        await createComment({
          params: comment,
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          expectedHttpCode: 403,
          auth: { user, space: null },
        });
      });
    }
  });
};

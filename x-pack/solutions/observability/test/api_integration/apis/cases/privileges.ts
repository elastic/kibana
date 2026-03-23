/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AttachmentType } from '@kbn/cases-plugin/common';
import type {
  CaseStatuses,
  UserCommentAttachmentPayload,
} from '@kbn/cases-plugin/common/types/domain';
import { observabilityFeatureId as OBSERVABILITY_APP_ID } from '@kbn/observability-plugin/common';

import {
  createCase,
  deleteAllCaseItems,
  deleteCases,
  getCase,
  createComment,
  updateCaseStatus,
  updateCaseAssignee,
} from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/api';
import { getPostCaseRequest } from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/mock';
import { suggestUserProfiles } from '@kbn/test-suites-xpack-platform/cases_api_integration/common/lib/api/user_profiles';
import {
  obsCasesAllUser,
  obsCasesV2AllUser,
  obsCasesV3AllUser,
  obsCasesNoDeleteUser,
  obsCasesOnlyDeleteUser,
  obsCasesV2NoReopenWithCreateCommentUser,
  obsCasesV2NoCreateCommentWithReopenUser,
} from '@kbn/test-suites-xpack-platform/api_integration/apis/cases/common/users';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  describe('feature privilege', () => {
    const es = getService('es');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const supertest = getService('supertest');

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    for (const { user, owner } of [
      { user: obsCasesAllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV2AllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesNoDeleteUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV3AllUser, owner: OBSERVABILITY_APP_ID },
    ]) {
      it(`User ${user.username} with role(s) ${user.roles.join()} can create a case`, async () => {
        await createCase(supertest, getPostCaseRequest({ owner }), 200, {
          user,
          space: null,
        });
      });
    }

    for (const { user, owner } of [
      { user: obsCasesAllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV2AllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesNoDeleteUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV3AllUser, owner: OBSERVABILITY_APP_ID },
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

    for (const { user, owner } of [{ user: obsCasesOnlyDeleteUser, owner: OBSERVABILITY_APP_ID }]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} cannot create a case`, async () => {
        await createCase(supertestWithoutAuth, getPostCaseRequest({ owner }), 403, {
          user,
          space: null,
        });
      });
    }

    for (const { user, owner } of [{ user: obsCasesOnlyDeleteUser, owner: OBSERVABILITY_APP_ID }]) {
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
      { user: obsCasesAllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV2AllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesOnlyDeleteUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV3AllUser, owner: OBSERVABILITY_APP_ID },
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

    for (const { user, owner } of [{ user: obsCasesNoDeleteUser, owner: OBSERVABILITY_APP_ID }]) {
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
      { user: obsCasesAllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV2AllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV3AllUser, owner: OBSERVABILITY_APP_ID },
    ]) {
      it(`User ${user.username} with role(s) ${user.roles.join()} can reopen a case`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner }));
        await updateCaseStatus({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          status: 'closed' as CaseStatuses,
          version: caseInfo.version,
          expectedHttpCode: 200,
          auth: { user, space: null },
        });

        const updatedCase = await getCase({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          expectedHttpCode: 200,
          auth: { user, space: null },
        });

        await updateCaseStatus({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          status: 'open' as CaseStatuses,
          version: updatedCase.version,
          expectedHttpCode: 200,
          auth: { user, space: null },
        });
      });
    }

    for (const { user, owner, userWithFullPerms } of [
      {
        user: obsCasesV2NoCreateCommentWithReopenUser,
        owner: OBSERVABILITY_APP_ID,
        userWithFullPerms: obsCasesV3AllUser,
      },
    ]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} can reopen a case, if it's closed`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner }));
        await updateCaseStatus({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          status: 'closed' as CaseStatuses,
          version: caseInfo.version,
          expectedHttpCode: 200,
          auth: { user: userWithFullPerms, space: null },
        });

        const updatedCase = await getCase({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          expectedHttpCode: 200,
          auth: { user, space: null },
        });

        await updateCaseStatus({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          status: 'open' as CaseStatuses,
          version: updatedCase.version,
          expectedHttpCode: 200,
          auth: { user, space: null },
        });
      });
    }

    for (const { user, owner, userWithFullPerms } of [
      {
        user: obsCasesV2NoReopenWithCreateCommentUser,
        owner: OBSERVABILITY_APP_ID,
        userWithFullPerms: obsCasesV3AllUser,
      },
    ]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} CANNOT reopen a case`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner }));
        await updateCaseStatus({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          status: 'closed' as CaseStatuses,
          version: caseInfo.version,
          expectedHttpCode: 200,
          auth: { user: userWithFullPerms, space: null },
        });

        const updatedCase = await getCase({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          expectedHttpCode: 200,
          auth: { user, space: null },
        });

        await updateCaseStatus({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          status: 'open' as CaseStatuses,
          version: updatedCase.version,
          expectedHttpCode: 403,
          auth: { user, space: null },
        });
      });
    }

    for (const { user, owner } of [
      { user: obsCasesAllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV2AllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV2NoReopenWithCreateCommentUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV3AllUser, owner: OBSERVABILITY_APP_ID },
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

    for (const { user, owner, userWithFullPerms } of [
      {
        user: obsCasesV2NoCreateCommentWithReopenUser,
        owner: OBSERVABILITY_APP_ID,
        userWithFullPerms: obsCasesV3AllUser,
      },
      {
        user: obsCasesOnlyDeleteUser,
        owner: OBSERVABILITY_APP_ID,
        userWithFullPerms: obsCasesAllUser,
      },
    ]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} CANNOT change assignee`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner }));
        const [{ uid: assigneeId }] = await suggestUserProfiles({
          supertest: supertestWithoutAuth,
          req: { name: userWithFullPerms.username, owners: [owner], size: 1 },
          auth: { user: userWithFullPerms, space: null },
        });
        await updateCaseAssignee({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          assigneeId,
          expectedHttpCode: 403,
          auth: { user, space: null },
          version: caseInfo.version,
        });
      });
    }

    for (const { user, owner } of [
      { user: obsCasesV2AllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesAllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesAllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV2AllUser, owner: OBSERVABILITY_APP_ID },
      { user: obsCasesV3AllUser, owner: OBSERVABILITY_APP_ID },
    ]) {
      it(`User ${
        user.username
      } with role(s) ${user.roles.join()} CAN change assignee`, async () => {
        const caseInfo = await createCase(supertest, getPostCaseRequest({ owner }));
        const [{ uid: assigneeId }] = await suggestUserProfiles({
          supertest: supertestWithoutAuth,
          req: { name: user.username, owners: [owner], size: 1 },
          auth: { user, space: null },
        });
        await updateCaseAssignee({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          assigneeId,
          expectedHttpCode: 200,
          version: caseInfo.version,
          auth: { user, space: null },
        });
      });
    }

    for (const { user, owner } of [
      { user: obsCasesV2NoCreateCommentWithReopenUser, owner: OBSERVABILITY_APP_ID },
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

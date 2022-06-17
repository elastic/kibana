/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import expect from '@kbn/expect';

import { AttributesTypeUser } from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { defaultUser, postCaseReq, postExternalReferenceReq } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createComment,
  getCaseUserActions,
  removeServerGeneratedPropertiesFromSavedObject,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('External references', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should create an external reference attachment type', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postExternalReferenceReq,
      });
      const comment = removeServerGeneratedPropertiesFromSavedObject(
        patchedCase.comments![0] as AttributesTypeUser
      );

      expect(comment).to.eql({
        ...postExternalReferenceReq,
        created_by: defaultUser,
        pushed_at: null,
        pushed_by: null,
        updated_by: null,
        owner: 'securitySolutionFixture',
      });
    });

    it('should create an external reference attachment type with metadata', async () => {
      const req = {
        ...postExternalReferenceReq,
        externalReferenceMetadata: {
          foo: 'foo',
          bar: { a: 'a' },
          baz: [{ b: 'b' }],
          total: 1,
          isValid: true,
        },
      };

      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: req,
      });
      const comment = removeServerGeneratedPropertiesFromSavedObject(
        patchedCase.comments![0] as AttributesTypeUser
      );

      expect(comment).to.eql({
        ...req,
        created_by: defaultUser,
        pushed_at: null,
        pushed_by: null,
        updated_by: null,
        owner: 'securitySolutionFixture',
      });
    });

    it('should create an external reference user action', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: postExternalReferenceReq,
      });

      const userActions = await getCaseUserActions({ supertest, caseID: postedCase.id });
      const commentUserAction = userActions[1];

      expect(commentUserAction.type).to.eql('comment');
      expect(commentUserAction.action).to.eql('create');
      expect(commentUserAction.payload).to.eql({ comment: postExternalReferenceReq });
    });

    it('should return 400 when missing attributes for external reference type', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const reqKeys = Object.keys(postExternalReferenceReq);
      for (const key of reqKeys) {
        await createComment({
          supertest,
          caseId: postedCase.id,
          // @ts-expect-error
          params: omit(key, postExternalReferenceReq),
          expectedHttpCode: 400,
        });
      }
    });

    it('400s when adding excess attributes for external reference attachment type', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment({
        supertest,
        caseId: postedCase.id,
        // @ts-expect-error
        params: { ...postExternalReferenceReq, notValid: 'test' },
        expectedHttpCode: 400,
      });
    });
  });
};

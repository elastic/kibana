/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { createCase, updateCase, findCases, deleteAllCaseItems } from '../../../../common/lib/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('assignees', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('create_case', () => {
      it('should get 403 when trying to create a a case with assignees', async () => {
        await createCase(
          supertest,
          {
            ...getPostCaseRequest(),
            assignees: [{ uid: '123' }],
          },
          403
        );
      });
    });

    describe('find_case', () => {
      it('should get 403 when trying to filter cases by assignees', async () => {
        await createCase(supertest, {
          ...getPostCaseRequest(),
        });

        await findCases({ supertest, query: { assignees: '123' }, expectedHttpCode: 403 });
      });
    });

    describe('patch_case', () => {
      it('should get 403 when trying to update assignees on a case', async () => {
        const postedCase = await createCase(supertest, {
          ...getPostCaseRequest(),
        });

        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                assignees: [{ uid: '123' }],
              },
            ],
          },
          expectedHttpCode: 403,
        });
      });
    });
  });
};

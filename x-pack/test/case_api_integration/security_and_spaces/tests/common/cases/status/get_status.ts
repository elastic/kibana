/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../../common/ftr_provider_context';

import { CaseStatuses } from '../../../../../../../plugins/cases/common/api';
import { postCaseReq } from '../../../../../common/lib/mock';
import {
  deleteCasesByESQuery,
  createCase,
  updateCase,
  getAllCasesStatuses,
} from '../../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_status', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    it('should return case statuses', async () => {
      await createCase(supertest, postCaseReq);
      const inProgressCase = await createCase(supertest, postCaseReq);
      const postedCase = await createCase(supertest, postCaseReq);

      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              status: CaseStatuses.closed,
            },
          ],
        },
      });

      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: inProgressCase.id,
              version: inProgressCase.version,
              status: CaseStatuses['in-progress'],
            },
          ],
        },
      });

      const statuses = await getAllCasesStatuses(supertest);

      expect(statuses).to.eql({
        count_open_cases: 1,
        count_closed_cases: 1,
        count_in_progress_cases: 1,
      });
    });

    describe('rbac', () => {
      // TODO:
    });
  });
};

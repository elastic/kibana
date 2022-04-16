/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CaseStatuses } from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { postCaseReq } from '../../../../../common/lib/mock';
import {
  createCase,
  updateCase,
  getAllCasesStatuses,
  deleteAllCaseItems,
  getAuthWithSuperUser,
} from '../../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();
  const authSpace2 = getAuthWithSuperUser('space2');

  describe('get_status', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should return case statuses in space1', async () => {
      /**
       * space1:
       *  open: 1
       *  in progress: 1
       *  closed: 0
       * space2:
       *  closed: 1
       */
      const [, inProgressCase, postedCase] = await Promise.all([
        createCase(supertest, postCaseReq, 200, authSpace1),
        createCase(supertest, postCaseReq, 200, authSpace1),
        createCase(supertest, postCaseReq, 200, authSpace2),
      ]);

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
        auth: authSpace1,
      });

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
        auth: authSpace2,
      });

      const statusesSpace1 = await getAllCasesStatuses({ supertest, auth: authSpace1 });
      const statusesSpace2 = await getAllCasesStatuses({ supertest, auth: authSpace2 });

      expect(statusesSpace1).to.eql({
        count_open_cases: 1,
        count_closed_cases: 0,
        count_in_progress_cases: 1,
      });

      expect(statusesSpace2).to.eql({
        count_open_cases: 0,
        count_closed_cases: 1,
        count_in_progress_cases: 0,
      });
    });
  });
};

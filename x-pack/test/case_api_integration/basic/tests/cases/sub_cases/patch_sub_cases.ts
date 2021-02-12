/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { SUB_CASES_PATCH_DEL_URL } from '../../../../../../plugins/case/common/constants';
import {
  createCaseAction,
  createSubCase,
  deleteAllCaseItems,
  deleteCaseAction,
  setStatus,
} from '../../../../common/lib/utils';
import { getSubCaseDetailsUrl } from '../../../../../../plugins/case/common/api/helpers';
import { CaseStatuses, SubCaseResponse } from '../../../../../../plugins/case/common/api';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('patch_sub_cases', () => {
    let actionID: string;
    before(async () => {
      actionID = await createCaseAction(supertest);
    });
    after(async () => {
      await deleteCaseAction(supertest, actionID);
    });
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should update the status of a sub case', async () => {
      const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });

      await setStatus({
        supertest,
        cases: [
          {
            id: caseInfo.subCase!.id,
            version: caseInfo.subCase!.version,
            status: CaseStatuses['in-progress'],
          },
        ],
        type: 'sub_case',
      });
      const { body: subCase }: { body: SubCaseResponse } = await supertest
        .get(getSubCaseDetailsUrl(caseInfo.id, caseInfo.subCase!.id))
        .expect(200);

      expect(subCase.status).to.eql(CaseStatuses['in-progress']);
    });

    it('404s when sub case id is invalid', async () => {
      await supertest
        .patch(`${SUB_CASES_PATCH_DEL_URL}`)
        .set('kbn-xsrf', 'true')
        .send({
          subCases: [
            {
              id: 'fake-id',
              version: 'blah',
              status: CaseStatuses.open,
            },
          ],
        })
        .expect(404);
    });

    it('406s when updating invalid fields for a sub case', async () => {
      const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });

      await supertest
        .patch(`${SUB_CASES_PATCH_DEL_URL}`)
        .set('kbn-xsrf', 'true')
        .send({
          subCases: [
            {
              id: caseInfo.subCase!.id,
              version: caseInfo.subCase!.version,
              type: 'blah',
            },
          ],
        })
        .expect(406);
    });
  });
}

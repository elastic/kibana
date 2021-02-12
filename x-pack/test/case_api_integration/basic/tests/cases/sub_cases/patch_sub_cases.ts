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
  getSignalsWithES,
  setStatus,
} from '../../../../common/lib/utils';
import { getSubCaseDetailsUrl } from '../../../../../../plugins/case/common/api/helpers';
import {
  CaseStatuses,
  CommentType,
  SubCaseResponse,
} from '../../../../../../plugins/case/common/api';
import { createAlertsString } from '../../../../common/lib/mock';

const defaultSignalsIndex = '.siem-signals-default-000001';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('patch_sub_cases', () => {
    let actionID: string;
    before(async () => {
      actionID = await createCaseAction(supertest);
    });
    after(async () => {
      await deleteCaseAction(supertest, actionID);
    });
    beforeEach(async () => {
      await esArchiver.load('cases/signals/default');
    });
    afterEach(async () => {
      await esArchiver.unload('cases/signals/default');
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

    it('should update the status of one alert attached to a sub case', async () => {
      const signalID = '5f2b9ec41f8febb1c06b5d1045aeabb9874733b7617e88a370510f2fb3a41a5d';

      const { newSubCaseInfo: caseInfo } = await createSubCase({
        supertest,
        actionID,
        comment: {
          alerts: createAlertsString([
            {
              _id: signalID,
              _index: defaultSignalsIndex,
            },
          ]),
          type: CommentType.generatedAlert,
        },
      });

      await es.indices.refresh({ index: defaultSignalsIndex });

      let signals = await getSignalsWithES({ es, indices: defaultSignalsIndex, ids: signalID });

      expect(signals.get(signalID)?._source.signal.status).to.be(CaseStatuses.open);

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

      await es.indices.refresh({ index: defaultSignalsIndex });

      signals = await getSignalsWithES({ es, indices: defaultSignalsIndex, ids: signalID });

      expect(signals.get(signalID)?._source.signal.status).to.be(CaseStatuses['in-progress']);
    });

    it('should update the status of one alert attached to a sub case', async () => {
      const signalID = '5f2b9ec41f8febb1c06b5d1045aeabb9874733b7617e88a370510f2fb3a41a5d';

      const signalID2 = '4d0f4b1533e46b66b43bdd0330d23f39f2cf42a7253153270e38d30cce9ff0c6';

      const { newSubCaseInfo: caseInfo } = await createSubCase({
        supertest,
        actionID,
        comment: {
          alerts: createAlertsString([
            {
              _id: signalID,
              _index: defaultSignalsIndex,
            },
            {
              _id: signalID2,
              _index: defaultSignalsIndex,
            },
          ]),
          type: CommentType.generatedAlert,
        },
      });

      await es.indices.refresh({ index: defaultSignalsIndex });

      let signals = await getSignalsWithES({
        es,
        indices: defaultSignalsIndex,
        ids: [signalID, signalID2],
      });

      expect(signals.get(signalID)?._source.signal.status).to.be(CaseStatuses.open);
      expect(signals.get(signalID2)?._source.signal.status).to.be(CaseStatuses.open);

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

      await es.indices.refresh({ index: defaultSignalsIndex });

      signals = await getSignalsWithES({
        es,
        indices: defaultSignalsIndex,
        ids: [signalID, signalID2],
      });

      expect(signals.get(signalID)?._source.signal.status).to.be(CaseStatuses['in-progress']);
      expect(signals.get(signalID2)?._source.signal.status).to.be(CaseStatuses['in-progress']);
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

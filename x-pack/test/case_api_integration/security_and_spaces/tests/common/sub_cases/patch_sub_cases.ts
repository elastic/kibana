/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import {
  CASES_URL,
  SUB_CASES_PATCH_DEL_URL,
} from '../../../../../../plugins/cases/common/constants';
import {
  createCaseAction,
  createSubCase,
  deleteAllCaseItems,
  deleteCaseAction,
  getSignalsWithES,
  setStatus,
} from '../../../../common/lib/utils';
import { getSubCaseDetailsUrl } from '../../../../../../plugins/cases/common/api/helpers';
import {
  CaseStatuses,
  CommentType,
  SubCaseResponse,
} from '../../../../../../plugins/cases/common/api';
import { createAlertsString } from '../../../../../../plugins/cases/server/connectors';
import { postCaseReq, postCollectionReq } from '../../../../common/lib/mock';

const defaultSignalsIndex = '.siem-signals-default-000001';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  // ENABLE_CASE_CONNECTOR: remove the outer describe once the case connector feature is completed
  describe('patch_sub_cases disabled route', () => {
    it('should return a 404 when attempting to access the route and the case connector feature is disabled', async () => {
      await supertest
        .patch(SUB_CASES_PATCH_DEL_URL)
        .set('kbn-xsrf', 'true')
        .send({ subCases: [] })
        .expect(404);
    });

    // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
    describe.skip('patch_sub_cases', () => {
      let actionID: string;
      before(async () => {
        actionID = await createCaseAction(supertest);
      });
      after(async () => {
        await deleteCaseAction(supertest, actionID);
      });
      beforeEach(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/signals/default');
      });
      afterEach(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/signals/default');
        await deleteAllCaseItems(es);
      });

      it('should update the status of a sub case', async () => {
        const { newSubCaseInfo: caseInfo } = await createSubCase({ supertest, actionID });

        await setStatus({
          supertest,
          cases: [
            {
              id: caseInfo.subCases![0].id,
              version: caseInfo.subCases![0].version,
              status: CaseStatuses['in-progress'],
            },
          ],
          type: 'sub_case',
        });
        const { body: subCase }: { body: SubCaseResponse } = await supertest
          .get(getSubCaseDetailsUrl(caseInfo.id, caseInfo.subCases![0].id))
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
                ruleId: 'id',
                ruleName: 'name',
              },
            ]),
            type: CommentType.generatedAlert,
            owner: 'securitySolutionFixture',
          },
        });

        await es.indices.refresh({ index: defaultSignalsIndex });

        let signals = await getSignalsWithES({ es, indices: defaultSignalsIndex, ids: signalID });

        expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal.status).to.be(
          CaseStatuses.open
        );

        await setStatus({
          supertest,
          cases: [
            {
              id: caseInfo.subCases![0].id,
              version: caseInfo.subCases![0].version,
              status: CaseStatuses['in-progress'],
            },
          ],
          type: 'sub_case',
        });

        await es.indices.refresh({ index: defaultSignalsIndex });

        signals = await getSignalsWithES({ es, indices: defaultSignalsIndex, ids: signalID });

        expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal.status).to.be(
          'acknowledged'
        );
      });

      it('should update the status of multiple alerts attached to a sub case', async () => {
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
                ruleId: 'id',
                ruleName: 'name',
              },
              {
                _id: signalID2,
                _index: defaultSignalsIndex,
                ruleId: 'id',
                ruleName: 'name',
              },
            ]),
            type: CommentType.generatedAlert,
            owner: 'securitySolutionFixture',
          },
        });

        await es.indices.refresh({ index: defaultSignalsIndex });

        let signals = await getSignalsWithES({
          es,
          indices: defaultSignalsIndex,
          ids: [signalID, signalID2],
        });

        expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal.status).to.be(
          CaseStatuses.open
        );
        expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal.status).to.be(
          CaseStatuses.open
        );

        await setStatus({
          supertest,
          cases: [
            {
              id: caseInfo.subCases![0].id,
              version: caseInfo.subCases![0].version,
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

        expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal.status).to.be(
          CaseStatuses['in-progress']
        );
        expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal.status).to.be(
          'acknowledged'
        );
      });

      it('should update the status of multiple alerts attached to multiple sub cases in one collection', async () => {
        const signalID = '5f2b9ec41f8febb1c06b5d1045aeabb9874733b7617e88a370510f2fb3a41a5d';
        const signalID2 = '4d0f4b1533e46b66b43bdd0330d23f39f2cf42a7253153270e38d30cce9ff0c6';

        const { newSubCaseInfo: initialCaseInfo } = await createSubCase({
          supertest,
          actionID,
          caseInfo: {
            ...postCollectionReq,
            settings: {
              syncAlerts: false,
            },
          },
          comment: {
            alerts: createAlertsString([
              {
                _id: signalID,
                _index: defaultSignalsIndex,
                ruleId: 'id',
                ruleName: 'name',
              },
            ]),
            type: CommentType.generatedAlert,
            owner: 'securitySolutionFixture',
          },
        });

        // This will close the first sub case and create a new one
        const { newSubCaseInfo: collectionWithSecondSub } = await createSubCase({
          supertest,
          actionID,
          caseID: initialCaseInfo.id,
          comment: {
            alerts: createAlertsString([
              {
                _id: signalID2,
                _index: defaultSignalsIndex,
                ruleId: 'id',
                ruleName: 'name',
              },
            ]),
            type: CommentType.generatedAlert,
            owner: 'securitySolutionFixture',
          },
        });

        await es.indices.refresh({ index: defaultSignalsIndex });

        let signals = await getSignalsWithES({
          es,
          indices: defaultSignalsIndex,
          ids: [signalID, signalID2],
        });

        // There should be no change in their status since syncing is disabled
        expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal.status).to.be(
          CaseStatuses.open
        );
        expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal.status).to.be(
          CaseStatuses.open
        );

        await setStatus({
          supertest,
          cases: [
            {
              id: collectionWithSecondSub.subCases![0].id,
              version: collectionWithSecondSub.subCases![0].version,
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

        // There still should be no change in their status since syncing is disabled
        expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal.status).to.be(
          CaseStatuses.open
        );
        expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal.status).to.be(
          CaseStatuses.open
        );

        // Turn sync alerts on
        await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            cases: [
              {
                id: collectionWithSecondSub.id,
                version: collectionWithSecondSub.version,
                settings: { syncAlerts: true },
              },
            ],
          })
          .expect(200);

        await es.indices.refresh({ index: defaultSignalsIndex });

        signals = await getSignalsWithES({
          es,
          indices: defaultSignalsIndex,
          ids: [signalID, signalID2],
        });

        expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal.status).to.be(
          CaseStatuses.closed
        );
        expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal.status).to.be(
          'acknowledged'
        );
      });

      it('should update the status of alerts attached to a case and sub case when sync settings is turned on', async () => {
        const signalID = '5f2b9ec41f8febb1c06b5d1045aeabb9874733b7617e88a370510f2fb3a41a5d';
        const signalID2 = '4d0f4b1533e46b66b43bdd0330d23f39f2cf42a7253153270e38d30cce9ff0c6';

        const { body: individualCase } = await supertest
          .post(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            ...postCaseReq,
            settings: {
              syncAlerts: false,
            },
          });

        const { newSubCaseInfo: caseInfo } = await createSubCase({
          supertest,
          actionID,
          caseInfo: {
            ...postCollectionReq,
            settings: {
              syncAlerts: false,
            },
          },
          comment: {
            alerts: createAlertsString([
              {
                _id: signalID,
                _index: defaultSignalsIndex,
                ruleId: 'id',
                ruleName: 'name',
              },
            ]),
            type: CommentType.generatedAlert,
            owner: 'securitySolutionFixture',
          },
        });

        const { body: updatedIndWithComment } = await supertest
          .post(`${CASES_URL}/${individualCase.id}/comments`)
          .set('kbn-xsrf', 'true')
          .send({
            alertId: signalID2,
            index: defaultSignalsIndex,
            rule: { id: 'test-rule-id', name: 'test-index-id' },
            type: CommentType.alert,
          })
          .expect(200);

        await es.indices.refresh({ index: defaultSignalsIndex });

        let signals = await getSignalsWithES({
          es,
          indices: defaultSignalsIndex,
          ids: [signalID, signalID2],
        });

        // There should be no change in their status since syncing is disabled
        expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal.status).to.be(
          CaseStatuses.open
        );
        expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal.status).to.be(
          CaseStatuses.open
        );

        await setStatus({
          supertest,
          cases: [
            {
              id: caseInfo.subCases![0].id,
              version: caseInfo.subCases![0].version,
              status: CaseStatuses['in-progress'],
            },
          ],
          type: 'sub_case',
        });

        const updatedIndWithStatus = (
          await setStatus({
            supertest,
            cases: [
              {
                id: updatedIndWithComment.id,
                version: updatedIndWithComment.version,
                status: CaseStatuses.closed,
              },
            ],
            type: 'case',
          })
        )[0]; // there should only be a single entry in the response

        await es.indices.refresh({ index: defaultSignalsIndex });

        signals = await getSignalsWithES({
          es,
          indices: defaultSignalsIndex,
          ids: [signalID, signalID2],
        });

        // There should still be no change in their status since syncing is disabled
        expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal.status).to.be(
          CaseStatuses.open
        );
        expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal.status).to.be(
          CaseStatuses.open
        );

        // Turn sync alerts on
        await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            cases: [
              {
                id: caseInfo.id,
                version: caseInfo.version,
                settings: { syncAlerts: true },
              },
            ],
          })
          .expect(200);

        await supertest
          .patch(CASES_URL)
          .set('kbn-xsrf', 'true')
          .send({
            cases: [
              {
                id: updatedIndWithStatus.id,
                version: updatedIndWithStatus.version,
                settings: { syncAlerts: true },
              },
            ],
          })
          .expect(200);

        await es.indices.refresh({ index: defaultSignalsIndex });

        signals = await getSignalsWithES({
          es,
          indices: defaultSignalsIndex,
          ids: [signalID, signalID2],
        });

        // alerts should be updated now that the
        expect(signals.get(defaultSignalsIndex)?.get(signalID)?._source?.signal.status).to.be(
          'acknowledged'
        );
        expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal.status).to.be(
          CaseStatuses.closed
        );
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
                id: caseInfo.subCases![0].id,
                version: caseInfo.subCases![0].version,
                type: 'blah',
              },
            ],
          })
          .expect(406);
      });
    });
  });
}

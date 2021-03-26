/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../plugins/cases/common/constants';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../plugins/security_solution/common/constants';
import {
  CasesResponse,
  CaseStatuses,
  CaseType,
  CommentType,
} from '../../../../../plugins/cases/common/api';
import {
  defaultUser,
  postCaseReq,
  postCaseResp,
  postCollectionReq,
  postCommentAlertReq,
  postCommentUserReq,
  removeServerGeneratedPropertiesFromCase,
} from '../../../common/lib/mock';
import { deleteAllCaseItems, getSignalsWithES, setStatus } from '../../../common/lib/utils';
import {
  createSignalsIndex,
  deleteSignalsIndex,
  deleteAllAlerts,
  getRuleForSignalTesting,
  waitForRuleSuccessOrStatus,
  waitForSignalsToBePresent,
  getSignalsByIds,
  createRule,
  getQuerySignalIds,
} from '../../../../detection_engine_api_integration/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('patch_cases', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should patch a case', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: patchedCases } = await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              status: 'closed',
            },
          ],
        })
        .expect(200);

      const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);
      expect(data).to.eql({
        ...postCaseResp(postedCase.id),
        closed_by: defaultUser,
        status: 'closed',
        updated_by: defaultUser,
      });
    });

    it('should patch a case with new connector', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: patchedCases } = await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              connector: {
                id: 'jira',
                name: 'Jira',
                type: '.jira',
                fields: { issueType: 'Task', priority: null, parent: null },
              },
            },
          ],
        })
        .expect(200);

      const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);
      expect(data).to.eql({
        ...postCaseResp(postedCase.id),
        connector: {
          id: 'jira',
          name: 'Jira',
          type: '.jira',
          fields: { issueType: 'Task', priority: null, parent: null },
        },
        updated_by: defaultUser,
      });
    });

    it('unhappy path - 404s when case is not there', async () => {
      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: 'not-real',
              version: 'version',
              status: 'closed',
            },
          ],
        })
        .expect(404);
    });

    // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
    it.skip('should 400 and not allow converting a collection back to an individual case', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCollectionReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              type: CaseType.individual,
            },
          ],
        })
        .expect(400);
    });

    // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
    it.skip('should allow converting an individual case to a collection when it does not have alerts', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentUserReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: patchedCase.id,
              version: patchedCase.version,
              type: CaseType.collection,
            },
          ],
        })
        .expect(200);
    });

    it('should 400 when attempting to update an individual case to a collection when it has alerts attached to it', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      const { body: patchedCase } = await supertest
        .post(`${CASES_URL}/${postedCase.id}/comments`)
        .set('kbn-xsrf', 'true')
        .send(postCommentAlertReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: patchedCase.id,
              version: patchedCase.version,
              type: CaseType.collection,
            },
          ],
        })
        .expect(400);
    });

    it('should 400 when attempting to update the case type when the case connector feature is disabled', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              type: CaseType.collection,
            },
          ],
        })
        .expect(400);
    });

    // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
    it.skip("should 400 when attempting to update a collection case's status", async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCollectionReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              status: 'closed',
            },
          ],
        })
        .expect(400);
    });

    it('unhappy path - 406s when excess data sent', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              badKey: 'closed',
            },
          ],
        })
        .expect(406);
    });

    it('unhappy path - 400s when bad data sent', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              status: true,
            },
          ],
        })
        .expect(400);
    });

    it('unhappy path - 400s when unsupported status sent', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              status: 'not-supported',
            },
          ],
        })
        .expect(400);
    });

    it('unhappy path - 400s when bad connector type sent', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              connector: { id: 'none', name: 'none', type: '.not-exists', fields: null },
            },
          ],
        })
        .expect(400);
    });

    it('unhappy path - 400s when bad connector sent', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              connector: {
                id: 'none',
                name: 'none',
                type: '.jira',
                fields: { unsupported: 'value' },
              },
            },
          ],
        })
        .expect(400);
    });

    it('unhappy path - 409s when conflict', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);

      await supertest
        .patch(`${CASES_URL}`)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: 'version',
              status: 'closed',
            },
          ],
        })
        .expect(409);
    });

    describe('alerts', () => {
      describe('esArchiver', () => {
        const defaultSignalsIndex = '.siem-signals-default-000001';

        beforeEach(async () => {
          await esArchiver.load('cases/signals/default');
        });
        afterEach(async () => {
          await esArchiver.unload('cases/signals/default');
          await deleteAllCaseItems(es);
        });

        it('should update the status of multiple alerts attached to multiple cases', async () => {
          const signalID = '5f2b9ec41f8febb1c06b5d1045aeabb9874733b7617e88a370510f2fb3a41a5d';
          const signalID2 = '4d0f4b1533e46b66b43bdd0330d23f39f2cf42a7253153270e38d30cce9ff0c6';

          const { body: individualCase1 } = await supertest
            .post(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send({
              ...postCaseReq,
              settings: {
                syncAlerts: false,
              },
            });

          const { body: updatedInd1WithComment } = await supertest
            .post(`${CASES_URL}/${individualCase1.id}/comments`)
            .set('kbn-xsrf', 'true')
            .send({
              alertId: signalID,
              index: defaultSignalsIndex,
              rule: { id: 'test-rule-id', name: 'test-index-id' },
              type: CommentType.alert,
            })
            .expect(200);

          const { body: individualCase2 } = await supertest
            .post(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send({
              ...postCaseReq,
              settings: {
                syncAlerts: false,
              },
            });

          const { body: updatedInd2WithComment } = await supertest
            .post(`${CASES_URL}/${individualCase2.id}/comments`)
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

          const updatedIndWithStatus: CasesResponse = (await setStatus({
            supertest,
            cases: [
              {
                id: updatedInd1WithComment.id,
                version: updatedInd1WithComment.version,
                status: CaseStatuses.closed,
              },
              {
                id: updatedInd2WithComment.id,
                version: updatedInd2WithComment.version,
                status: CaseStatuses['in-progress'],
              },
            ],
            type: 'case',
          })) as CasesResponse;

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

          // turn on the sync settings
          await supertest
            .patch(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send({
              cases: updatedIndWithStatus.map((caseInfo) => ({
                id: caseInfo.id,
                version: caseInfo.version,
                settings: { syncAlerts: true },
              })),
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
            CaseStatuses.closed
          );
          expect(signals.get(defaultSignalsIndex)?.get(signalID2)?._source?.signal.status).to.be(
            CaseStatuses['in-progress']
          );
        });
      });

      describe('esArchiver', () => {
        const defaultSignalsIndex = '.siem-signals-default-000001';

        beforeEach(async () => {
          await esArchiver.load('cases/signals/duplicate_ids');
        });
        afterEach(async () => {
          await esArchiver.unload('cases/signals/duplicate_ids');
          await deleteAllCaseItems(es);
        });

        it('should not update the status of duplicate alert ids in separate indices', async () => {
          const getSignals = async () => {
            return getSignalsWithES({
              es,
              indices: [defaultSignalsIndex, signalsIndex2],
              ids: [signalIDInFirstIndex, signalIDInSecondIndex],
            });
          };

          // this id exists only in .siem-signals-default-000001
          const signalIDInFirstIndex =
            'cae78067e65582a3b277c1ad46ba3cb29044242fe0d24bbf3fcde757fdd31d1c';
          // This id exists in both .siem-signals-default-000001 and .siem-signals-default-000002
          const signalIDInSecondIndex = 'duplicate-signal-id';
          const signalsIndex2 = '.siem-signals-default-000002';

          const { body: individualCase } = await supertest
            .post(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send({
              ...postCaseReq,
              settings: {
                syncAlerts: false,
              },
            });

          const { body: updatedIndWithComment } = await supertest
            .post(`${CASES_URL}/${individualCase.id}/comments`)
            .set('kbn-xsrf', 'true')
            .send({
              alertId: signalIDInFirstIndex,
              index: defaultSignalsIndex,
              rule: { id: 'test-rule-id', name: 'test-index-id' },
              type: CommentType.alert,
            })
            .expect(200);

          const { body: updatedIndWithComment2 } = await supertest
            .post(`${CASES_URL}/${updatedIndWithComment.id}/comments`)
            .set('kbn-xsrf', 'true')
            .send({
              alertId: signalIDInSecondIndex,
              index: signalsIndex2,
              rule: { id: 'test-rule-id', name: 'test-index-id' },
              type: CommentType.alert,
            })
            .expect(200);

          await es.indices.refresh({ index: defaultSignalsIndex });

          let signals = await getSignals();
          // There should be no change in their status since syncing is disabled
          expect(
            signals.get(defaultSignalsIndex)?.get(signalIDInFirstIndex)?._source?.signal.status
          ).to.be(CaseStatuses.open);
          expect(
            signals.get(signalsIndex2)?.get(signalIDInSecondIndex)?._source?.signal.status
          ).to.be(CaseStatuses.open);

          const updatedIndWithStatus: CasesResponse = (await setStatus({
            supertest,
            cases: [
              {
                id: updatedIndWithComment2.id,
                version: updatedIndWithComment2.version,
                status: CaseStatuses.closed,
              },
            ],
            type: 'case',
          })) as CasesResponse;

          await es.indices.refresh({ index: defaultSignalsIndex });

          signals = await getSignals();

          // There should still be no change in their status since syncing is disabled
          expect(
            signals.get(defaultSignalsIndex)?.get(signalIDInFirstIndex)?._source?.signal.status
          ).to.be(CaseStatuses.open);
          expect(
            signals.get(signalsIndex2)?.get(signalIDInSecondIndex)?._source?.signal.status
          ).to.be(CaseStatuses.open);

          // turn on the sync settings
          await supertest
            .patch(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send({
              cases: [
                {
                  id: updatedIndWithStatus[0].id,
                  version: updatedIndWithStatus[0].version,
                  settings: { syncAlerts: true },
                },
              ],
            })
            .expect(200);
          await es.indices.refresh({ index: defaultSignalsIndex });

          signals = await getSignals();

          // alerts should be updated now that the
          expect(
            signals.get(defaultSignalsIndex)?.get(signalIDInFirstIndex)?._source?.signal.status
          ).to.be(CaseStatuses.closed);
          expect(
            signals.get(signalsIndex2)?.get(signalIDInSecondIndex)?._source?.signal.status
          ).to.be(CaseStatuses.closed);

          // the duplicate signal id in the other index should not be affect (so its status should be open)
          expect(
            signals.get(defaultSignalsIndex)?.get(signalIDInSecondIndex)?._source?.signal.status
          ).to.be(CaseStatuses.open);
        });
      });

      describe('detections rule', () => {
        beforeEach(async () => {
          await esArchiver.load('auditbeat/hosts');
          await createSignalsIndex(supertest);
        });

        afterEach(async () => {
          await deleteSignalsIndex(supertest);
          await deleteAllAlerts(supertest);
          await esArchiver.unload('auditbeat/hosts');
        });

        it('updates alert status when the status is updated and syncAlerts=true', async () => {
          const rule = getRuleForSignalTesting(['auditbeat-*']);

          const { body: postedCase } = await supertest
            .post(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send(postCaseReq)
            .expect(200);

          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signals = await getSignalsByIds(supertest, [id]);

          const alert = signals.hits.hits[0];
          expect(alert._source.signal.status).eql('open');

          const { body: caseUpdated } = await supertest
            .post(`${CASES_URL}/${postedCase.id}/comments`)
            .set('kbn-xsrf', 'true')
            .send({
              alertId: alert._id,
              index: alert._index,
              rule: {
                id: 'id',
                name: 'name',
              },
              type: CommentType.alert,
            })
            .expect(200);

          await es.indices.refresh({ index: alert._index });

          await supertest
            .patch(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send({
              cases: [
                {
                  id: caseUpdated.id,
                  version: caseUpdated.version,
                  status: 'in-progress',
                },
              ],
            })
            .expect(200);

          // force a refresh on the index that the signal is stored in so that we can search for it and get the correct
          // status
          await es.indices.refresh({ index: alert._index });

          const { body: updatedAlert } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQuerySignalIds([alert._id]))
            .expect(200);

          expect(updatedAlert.hits.hits[0]._source.signal.status).eql('in-progress');
        });

        it('does NOT updates alert status when the status is updated and syncAlerts=false', async () => {
          const rule = getRuleForSignalTesting(['auditbeat-*']);

          const { body: postedCase } = await supertest
            .post(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send({ ...postCaseReq, settings: { syncAlerts: false } })
            .expect(200);

          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signals = await getSignalsByIds(supertest, [id]);

          const alert = signals.hits.hits[0];
          expect(alert._source.signal.status).eql('open');

          const { body: caseUpdated } = await supertest
            .post(`${CASES_URL}/${postedCase.id}/comments`)
            .set('kbn-xsrf', 'true')
            .send({
              alertId: alert._id,
              index: alert._index,
              type: CommentType.alert,
              rule: {
                id: 'id',
                name: 'name',
              },
            })
            .expect(200);

          await supertest
            .patch(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send({
              cases: [
                {
                  id: caseUpdated.id,
                  version: caseUpdated.version,
                  status: 'in-progress',
                },
              ],
            })
            .expect(200);

          const { body: updatedAlert } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQuerySignalIds([alert._id]))
            .expect(200);

          expect(updatedAlert.hits.hits[0]._source.signal.status).eql('open');
        });

        it('it updates alert status when syncAlerts is turned on', async () => {
          const rule = getRuleForSignalTesting(['auditbeat-*']);

          const { body: postedCase } = await supertest
            .post(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send({ ...postCaseReq, settings: { syncAlerts: false } })
            .expect(200);

          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signals = await getSignalsByIds(supertest, [id]);

          const alert = signals.hits.hits[0];
          expect(alert._source.signal.status).eql('open');

          const { body: caseUpdated } = await supertest
            .post(`${CASES_URL}/${postedCase.id}/comments`)
            .set('kbn-xsrf', 'true')
            .send({
              alertId: alert._id,
              index: alert._index,
              rule: {
                id: 'id',
                name: 'name',
              },
              type: CommentType.alert,
            })
            .expect(200);

          // Update the status of the case with sync alerts off
          const { body: caseStatusUpdated } = await supertest
            .patch(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send({
              cases: [
                {
                  id: caseUpdated.id,
                  version: caseUpdated.version,
                  status: 'in-progress',
                },
              ],
            })
            .expect(200);

          // Turn sync alerts on
          await supertest
            .patch(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send({
              cases: [
                {
                  id: caseStatusUpdated[0].id,
                  version: caseStatusUpdated[0].version,
                  settings: { syncAlerts: true },
                },
              ],
            })
            .expect(200);

          // refresh the index because syncAlerts was set to true so the alert's status should have been updated
          await es.indices.refresh({ index: alert._index });

          const { body: updatedAlert } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQuerySignalIds([alert._id]))
            .expect(200);

          expect(updatedAlert.hits.hits[0]._source.signal.status).eql('in-progress');
        });

        it('it does NOT updates alert status when syncAlerts is turned off', async () => {
          const rule = getRuleForSignalTesting(['auditbeat-*']);

          const { body: postedCase } = await supertest
            .post(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send(postCaseReq)
            .expect(200);

          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signals = await getSignalsByIds(supertest, [id]);

          const alert = signals.hits.hits[0];
          expect(alert._source.signal.status).eql('open');

          const { body: caseUpdated } = await supertest
            .post(`${CASES_URL}/${postedCase.id}/comments`)
            .set('kbn-xsrf', 'true')
            .send({
              alertId: alert._id,
              index: alert._index,
              type: CommentType.alert,
              rule: {
                id: 'id',
                name: 'name',
              },
            })
            .expect(200);

          // Turn sync alerts off
          const { body: caseSettingsUpdated } = await supertest
            .patch(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send({
              cases: [
                {
                  id: caseUpdated.id,
                  version: caseUpdated.version,
                  settings: { syncAlerts: false },
                },
              ],
            })
            .expect(200);

          // Update the status of the case with sync alerts off
          await supertest
            .patch(CASES_URL)
            .set('kbn-xsrf', 'true')
            .send({
              cases: [
                {
                  id: caseSettingsUpdated[0].id,
                  version: caseSettingsUpdated[0].version,
                  status: 'in-progress',
                },
              ],
            })
            .expect(200);

          const { body: updatedAlert } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQuerySignalIds([alert._id]))
            .expect(200);

          expect(updatedAlert.hits.hits[0]._source.signal.status).eql('open');
        });
      });
    });
  });
};

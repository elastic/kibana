/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../../plugins/security_solution/common/constants';
import {
  CasesResponse,
  CaseStatuses,
  CaseType,
  CommentType,
  ConnectorTypes,
} from '../../../../../../plugins/cases/common/api';
import {
  defaultUser,
  getPostCaseRequest,
  postCaseReq,
  postCaseResp,
  postCollectionReq,
  postCommentAlertReq,
  postCommentUserReq,
} from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  getSignalsWithES,
  setStatus,
  createCase,
  createComment,
  updateCase,
  getCaseUserActions,
  removeServerGeneratedPropertiesFromCase,
  removeServerGeneratedPropertiesFromUserAction,
  findCases,
  superUserSpace1Auth,
} from '../../../../common/lib/utils';
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
} from '../../../../../detection_engine_api_integration/utils';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('patch_cases', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('happy path', () => {
      it('should patch a case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                title: 'new title',
              },
            ],
          },
        });

        const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);
        expect(data).to.eql({
          ...postCaseResp(),
          title: 'new title',
          updated_by: defaultUser,
        });
      });

      it('should closes the case correctly', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCases = await updateCase({
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

        const userActions = await getCaseUserActions({ supertest, caseID: postedCase.id });
        const statusUserAction = removeServerGeneratedPropertiesFromUserAction(userActions[1]);
        const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);

        expect(data).to.eql({
          ...postCaseResp(),
          status: CaseStatuses.closed,
          closed_by: defaultUser,
          updated_by: defaultUser,
        });

        expect(statusUserAction).to.eql({
          action_field: ['status'],
          action: 'update',
          action_by: defaultUser,
          new_value: CaseStatuses.closed,
          old_value: CaseStatuses.open,
          case_id: `${postedCase.id}`,
          comment_id: null,
          sub_case_id: '',
          owner: 'securitySolutionFixture',
        });
      });

      it('should change the status of case to in-progress correctly', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: CaseStatuses['in-progress'],
              },
            ],
          },
        });

        const userActions = await getCaseUserActions({ supertest, caseID: postedCase.id });
        const statusUserAction = removeServerGeneratedPropertiesFromUserAction(userActions[1]);
        const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);

        expect(data).to.eql({
          ...postCaseResp(),
          status: CaseStatuses['in-progress'],
          updated_by: defaultUser,
        });

        expect(statusUserAction).to.eql({
          action_field: ['status'],
          action: 'update',
          action_by: defaultUser,
          new_value: CaseStatuses['in-progress'],
          old_value: CaseStatuses.open,
          case_id: `${postedCase.id}`,
          comment_id: null,
          sub_case_id: '',
          owner: 'securitySolutionFixture',
        });
      });

      it('should patch a case with new connector', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                connector: {
                  id: 'jira',
                  name: 'Jira',
                  type: ConnectorTypes.jira,
                  fields: { issueType: 'Task', priority: null, parent: null },
                },
              },
            ],
          },
        });

        const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);
        expect(data).to.eql({
          ...postCaseResp(),
          connector: {
            id: 'jira',
            name: 'Jira',
            type: '.jira',
            fields: { issueType: 'Task', priority: null, parent: null },
          },
          updated_by: defaultUser,
        });
      });

      // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
      it.skip('should allow converting an individual case to a collection when it does not have alerts', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: patchedCase.id,
                version: patchedCase.version,
                type: CaseType.collection,
              },
            ],
          },
        });
      });
    });

    describe('unhappy path', () => {
      it('400s when attempting to change the owner of a case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                owner: 'observabilityFixture',
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('404s when case is not there', async () => {
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: 'not-real',
                version: 'version',
                status: CaseStatuses.closed,
              },
            ],
          },
          expectedHttpCode: 404,
        });
      });

      it('400s when id is missing', async () => {
        await updateCase({
          supertest,
          params: {
            cases: [
              // @ts-expect-error
              {
                version: 'version',
                status: CaseStatuses.closed,
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('406s when fields are identical', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: CaseStatuses.open,
              },
            ],
          },
          expectedHttpCode: 406,
        });
      });

      it('400s when version is missing', async () => {
        await updateCase({
          supertest,
          params: {
            cases: [
              // @ts-expect-error
              {
                id: 'not-real',
                status: CaseStatuses.closed,
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
      it.skip('should 400 and not allow converting a collection back to an individual case', async () => {
        const postedCase = await createCase(supertest, postCollectionReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                type: CaseType.individual,
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('406s when excess data sent', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                // @ts-expect-error
                badKey: 'closed',
              },
            ],
          },
          expectedHttpCode: 406,
        });
      });

      it('400s when bad data sent', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                // @ts-expect-error
                status: true,
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when unsupported status sent', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                // @ts-expect-error
                status: 'not-supported',
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when bad connector type sent', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                // @ts-expect-error
                connector: { id: 'none', name: 'none', type: '.not-exists', fields: null },
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('400s when bad connector sent', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                connector: {
                  id: 'jira',
                  name: 'Jira',
                  // @ts-expect-error
                  type: ConnectorTypes.jira,
                  // @ts-expect-error
                  fields: { unsupported: 'value' },
                },
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('409s when version does not match', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: 'version',
                // @ts-expect-error
                status: 'closed',
              },
            ],
          },
          expectedHttpCode: 409,
        });
      });

      it('should 400 when attempting to update an individual case to a collection when it has alerts attached to it', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentAlertReq,
        });
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: patchedCase.id,
                version: patchedCase.version,
                type: CaseType.collection,
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      // ENABLE_CASE_CONNECTOR: once the case connector feature is completed delete these tests
      it('should 400 when attempting to update the case type when the case connector feature is disabled', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                type: CaseType.collection,
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      // ENABLE_CASE_CONNECTOR: once the case connector feature is completed unskip these tests
      it.skip("should 400 when attempting to update a collection case's status", async () => {
        const postedCase = await createCase(supertest, postCollectionReq);
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
          expectedHttpCode: 400,
        });
      });

      it('400s if the title is too long', async () => {
        const longTitle =
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nulla enim, rutrum sit amet euismod venenatis, blandit et massa. Nulla id consectetur enim.';

        const postedCase = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                title: longTitle,
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });
    });

    describe('alerts', () => {
      describe('esArchiver', () => {
        const defaultSignalsIndex = '.siem-signals-default-000001';

        beforeEach(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/cases/signals/default');
        });
        afterEach(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/cases/signals/default');
          await deleteAllCaseItems(es);
        });

        it('should update the status of multiple alerts attached to multiple cases', async () => {
          const signalID = '5f2b9ec41f8febb1c06b5d1045aeabb9874733b7617e88a370510f2fb3a41a5d';
          const signalID2 = '4d0f4b1533e46b66b43bdd0330d23f39f2cf42a7253153270e38d30cce9ff0c6';

          // does NOT updates alert status when adding comments and syncAlerts=false
          const individualCase1 = await createCase(supertest, {
            ...postCaseReq,
            settings: {
              syncAlerts: false,
            },
          });

          const updatedInd1WithComment = await createComment({
            supertest,
            caseId: individualCase1.id,
            params: {
              alertId: signalID,
              index: defaultSignalsIndex,
              rule: { id: 'test-rule-id', name: 'test-index-id' },
              type: CommentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

          const individualCase2 = await createCase(supertest, {
            ...postCaseReq,
            settings: {
              syncAlerts: false,
            },
          });

          const updatedInd2WithComment = await createComment({
            supertest,
            caseId: individualCase2.id,
            params: {
              alertId: signalID2,
              index: defaultSignalsIndex,
              rule: { id: 'test-rule-id', name: 'test-index-id' },
              type: CommentType.alert,
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

          // does NOT updates alert status when the status is updated and syncAlerts=false
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

          // it updates alert status when syncAlerts is turned on
          // turn on the sync settings
          await updateCase({
            supertest,
            params: {
              cases: updatedIndWithStatus.map((caseInfo) => ({
                id: caseInfo.id,
                version: caseInfo.version,
                settings: { syncAlerts: true },
              })),
            },
          });

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
          await esArchiver.load('x-pack/test/functional/es_archives/cases/signals/duplicate_ids');
        });
        afterEach(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/cases/signals/duplicate_ids');
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

          const individualCase = await createCase(supertest, {
            ...postCaseReq,
            settings: {
              syncAlerts: false,
            },
          });

          const updatedIndWithComment = await createComment({
            supertest,
            caseId: individualCase.id,
            params: {
              alertId: signalIDInFirstIndex,
              index: defaultSignalsIndex,
              rule: { id: 'test-rule-id', name: 'test-index-id' },
              type: CommentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

          const updatedIndWithComment2 = await createComment({
            supertest,
            caseId: updatedIndWithComment.id,
            params: {
              alertId: signalIDInSecondIndex,
              index: signalsIndex2,
              rule: { id: 'test-rule-id', name: 'test-index-id' },
              type: CommentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

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
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: updatedIndWithStatus[0].id,
                  version: updatedIndWithStatus[0].version,
                  settings: { syncAlerts: true },
                },
              ],
            },
          });
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
          await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
          await createSignalsIndex(supertest);
        });

        afterEach(async () => {
          await deleteSignalsIndex(supertest);
          await deleteAllAlerts(supertest);
          await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
        });

        it('updates alert status when the status is updated and syncAlerts=true', async () => {
          const rule = getRuleForSignalTesting(['auditbeat-*']);
          const postedCase = await createCase(supertest, postCaseReq);

          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signals = await getSignalsByIds(supertest, [id]);

          const alert = signals.hits.hits[0];
          expect(alert._source.signal.status).eql('open');

          const caseUpdated = await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              alertId: alert._id,
              index: alert._index,
              rule: {
                id: 'id',
                name: 'name',
              },
              type: CommentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

          await es.indices.refresh({ index: alert._index });
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: caseUpdated.id,
                  version: caseUpdated.version,
                  status: CaseStatuses['in-progress'],
                },
              ],
            },
          });

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

          const postedCase = await createCase(supertest, {
            ...postCaseReq,
            settings: { syncAlerts: false },
          });

          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signals = await getSignalsByIds(supertest, [id]);

          const alert = signals.hits.hits[0];
          expect(alert._source.signal.status).eql('open');

          const caseUpdated = await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              alertId: alert._id,
              index: alert._index,
              type: CommentType.alert,
              rule: {
                id: 'id',
                name: 'name',
              },
              owner: 'securitySolutionFixture',
            },
          });

          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: caseUpdated.id,
                  version: caseUpdated.version,
                  status: CaseStatuses['in-progress'],
                },
              ],
            },
          });

          const { body: updatedAlert } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQuerySignalIds([alert._id]))
            .expect(200);

          expect(updatedAlert.hits.hits[0]._source.signal.status).eql('open');
        });

        it('it updates alert status when syncAlerts is turned on', async () => {
          const rule = getRuleForSignalTesting(['auditbeat-*']);

          const postedCase = await createCase(supertest, {
            ...postCaseReq,
            settings: { syncAlerts: false },
          });

          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signals = await getSignalsByIds(supertest, [id]);

          const alert = signals.hits.hits[0];
          expect(alert._source.signal.status).eql('open');

          const caseUpdated = await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              alertId: alert._id,
              index: alert._index,
              rule: {
                id: 'id',
                name: 'name',
              },
              type: CommentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

          // Update the status of the case with sync alerts off
          const caseStatusUpdated = await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: caseUpdated.id,
                  version: caseUpdated.version,
                  status: CaseStatuses['in-progress'],
                },
              ],
            },
          });

          // Turn sync alerts on
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: caseStatusUpdated[0].id,
                  version: caseStatusUpdated[0].version,
                  settings: { syncAlerts: true },
                },
              ],
            },
          });

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

          const postedCase = await createCase(supertest, postCaseReq);
          const { id } = await createRule(supertest, rule);
          await waitForRuleSuccessOrStatus(supertest, id);
          await waitForSignalsToBePresent(supertest, 1, [id]);
          const signals = await getSignalsByIds(supertest, [id]);

          const alert = signals.hits.hits[0];
          expect(alert._source.signal.status).eql('open');

          const caseUpdated = await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              alertId: alert._id,
              index: alert._index,
              type: CommentType.alert,
              rule: {
                id: 'id',
                name: 'name',
              },
              owner: 'securitySolutionFixture',
            },
          });

          // Turn sync alerts off
          const caseSettingsUpdated = await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: caseUpdated.id,
                  version: caseUpdated.version,
                  settings: { syncAlerts: false },
                },
              ],
            },
          });

          // Update the status of the case with sync alerts off
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: caseSettingsUpdated[0].id,
                  version: caseSettingsUpdated[0].version,
                  status: CaseStatuses['in-progress'],
                },
              ],
            },
          });

          const { body: updatedAlert } = await supertest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(getQuerySignalIds([alert._id]))
            .expect(200);

          expect(updatedAlert.hits.hits[0]._source.signal.status).eql('open');
        });
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should update a case when the user has the correct permissions', async () => {
        const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, {
          user: secOnly,
          space: 'space1',
        });

        const patchedCases = await updateCase({
          supertest: supertestWithoutAuth,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                title: 'new title',
              },
            ],
          },
          auth: { user: secOnly, space: 'space1' },
        });

        expect(patchedCases[0].owner).to.eql('securitySolutionFixture');
      });

      it('should update multiple cases when the user has the correct permissions', async () => {
        const [case1, case2, case3] = await Promise.all([
          createCase(supertestWithoutAuth, postCaseReq, 200, {
            user: superUser,
            space: 'space1',
          }),
          createCase(supertestWithoutAuth, postCaseReq, 200, {
            user: superUser,
            space: 'space1',
          }),
          createCase(supertestWithoutAuth, postCaseReq, 200, {
            user: superUser,
            space: 'space1',
          }),
        ]);

        const patchedCases = await updateCase({
          supertest: supertestWithoutAuth,
          params: {
            cases: [
              {
                id: case1.id,
                version: case1.version,
                title: 'new title',
              },
              {
                id: case2.id,
                version: case2.version,
                title: 'new title',
              },
              {
                id: case3.id,
                version: case3.version,
                title: 'new title',
              },
            ],
          },
          auth: { user: secOnly, space: 'space1' },
        });

        expect(patchedCases[0].owner).to.eql('securitySolutionFixture');
        expect(patchedCases[1].owner).to.eql('securitySolutionFixture');
        expect(patchedCases[2].owner).to.eql('securitySolutionFixture');
      });

      it('should not update a case when the user does not have the correct ownership', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'observabilityFixture' }),
          200,
          { user: obsOnly, space: 'space1' }
        );

        await updateCase({
          supertest: supertestWithoutAuth,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                title: 'new title',
              },
            ],
          },
          auth: { user: secOnly, space: 'space1' },
          expectedHttpCode: 403,
        });
      });

      it('should not update any cases when the user does not have the correct ownership', async () => {
        const [case1, case2, case3] = await Promise.all([
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          ),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          ),
          createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          ),
        ]);

        await updateCase({
          supertest: supertestWithoutAuth,
          params: {
            cases: [
              {
                id: case1.id,
                version: case1.version,
                title: 'new title',
              },
              {
                id: case2.id,
                version: case2.version,
                title: 'new title',
              },
              {
                id: case3.id,
                version: case3.version,
                title: 'new title',
              },
            ],
          },
          auth: { user: secOnly, space: 'space1' },
          expectedHttpCode: 403,
        });

        const resp = await findCases({ supertest, auth: superUserSpace1Auth });
        expect(resp.cases.length).to.eql(3);
        // the update should have failed and none of the title should have been changed
        expect(resp.cases[0].title).to.eql(postCaseReq.title);
        expect(resp.cases[1].title).to.eql(postCaseReq.title);
        expect(resp.cases[2].title).to.eql(postCaseReq.title);
      });

      for (const user of [globalRead, secOnlyRead, obsOnlyRead, obsSecRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should NOT update a case`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );

          await updateCase({
            supertest: supertestWithoutAuth,
            params: {
              cases: [
                {
                  id: postedCase.id,
                  version: postedCase.version,
                  title: 'new title',
                },
              ],
            },
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      }

      it('should NOT create a case in a space with no permissions', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space2',
          }
        );

        await updateCase({
          supertest: supertestWithoutAuth,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                title: 'new title',
              },
            ],
          },
          auth: { user: secOnly, space: 'space2' },
          expectedHttpCode: 403,
        });
      });
    });
  });
};

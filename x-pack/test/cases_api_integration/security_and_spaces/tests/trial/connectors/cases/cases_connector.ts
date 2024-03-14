/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type SuperTest from 'supertest';
import { createHash } from 'node:crypto';
import stringify from 'json-stable-stringify';
import {
  CasesConnectorRunParams,
  OracleRecordAttributes,
} from '@kbn/cases-plugin/server/connectors/cases/types';
import { AttachmentType, CasePostRequest } from '@kbn/cases-plugin/common';
import {
  AlertAttachment,
  Attachments,
  Case,
  CaseStatuses,
  CaseSeverity,
  ConnectorTypes,
  CustomFieldTypes,
} from '@kbn/cases-plugin/common/types/domain';
import { KbnClient } from '@kbn/test';
import { CasePersistedAttributes } from '@kbn/cases-plugin/server/common/types/case';
import {
  SEVERITY_EXTERNAL_TO_ESMODEL,
  STATUS_EXTERNAL_TO_ESMODEL,
} from '@kbn/cases-plugin/server/common/constants';
import { Client } from '@elastic/elasticsearch';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { User } from '../../../../../common/lib/authentication/types';
import {
  globalRead,
  noKibanaPrivileges,
  onlyActions,
} from '../../../../../common/lib/authentication/users';
import {
  deleteAllCaseItems,
  executeConnector,
  findCases,
  getAllComments,
  updateCase,
  getCase,
  getConfigurationRequest,
  createConfiguration,
  createComment,
} from '../../../../../common/lib/api';
import { getPostCaseRequest, postCommentAlertReq } from '../../../../../common/lib/mock';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { roles as api_int_roles } from '../../../../../../api_integration/apis/cases/common/roles';
import {
  casesAllUser,
  obsCasesAllUser,
  obsCasesReadUser,
  obsSecCasesAllUser,
  obsSecCasesReadUser,
  secAllCasesReadUser,
  secAllSpace1User,
  secAllUser,
  users as api_int_users,
} from '../../../../../../api_integration/apis/cases/common/users';
import { createUsersAndRoles, deleteUsersAndRoles } from '../../../../../common/lib/authentication';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');

  describe('Case connector', () => {
    const connectorId = 'system-connector-.cases';

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await clearOracleRecords(es, kibanaServer);
    });

    describe('validation', () => {
      it('returns 400 if the alerts do not contain _id and _index', async () => {
        const res = await executeConnector({
          supertest,
          connectorId,
          // @ts-expect-error: need to test schema validation
          req: getRequest({ alerts: [{ foo: 'bar' }] }),
        });

        expect(res.status).to.be('error');
        expect(res.serviceMessage).to.be(
          'Request validation failed (Error: [alerts.0]: Alert ID and index must be defined)'
        );
      });

      it('returns 400 when groupingBy has more than one value', async () => {
        const res = await executeConnector({
          supertest,
          connectorId,
          req: getRequest({ groupingBy: ['host.name', 'source.ip'] }),
        });

        expect(res.status).to.be('error');
        expect(res.serviceMessage).to.be(
          'Request validation failed (Error: [groupingBy]: array size is [2], but cannot be greater than [1])'
        );
      });

      it('returns 400 when timeWindow is invalid', async () => {
        const res = await executeConnector({
          supertest,
          connectorId,
          req: getRequest({ timeWindow: 'not-valid' }),
        });

        expect(res.status).to.be('error');
        expect(res.serviceMessage).to.be(
          'Request validation failed (Error: [timeWindow]: Not a valid time window)'
        );
      });

      it('returns 400 for valid date math but not valid time window', async () => {
        const res = await executeConnector({
          supertest,
          connectorId,
          req: getRequest({ timeWindow: '10d+3d' }),
        });

        expect(res.status).to.be('error');
        expect(res.serviceMessage).to.be(
          'Request validation failed (Error: [timeWindow]: Not a valid time window)'
        );
      });

      it('returns 400 for unsupported time units', async () => {
        for (const unit of ['s', 'm', 'H', 'h']) {
          const res = await executeConnector({
            supertest,
            connectorId,
            req: getRequest({ timeWindow: `5${unit}` }),
          });

          expect(res.status).to.be('error');
          expect(res.serviceMessage).to.be(
            'Request validation failed (Error: [timeWindow]: Not a valid time window)'
          );
        }
      });

      it('returns 400 when maximumCasesToOpen > 10', async () => {
        const res = await executeConnector({
          supertest,
          connectorId,
          req: getRequest({ maximumCasesToOpen: 11 }),
        });

        expect(res.status).to.be('error');
        expect(res.serviceMessage).to.be(
          'Request validation failed (Error: [maximumCasesToOpen]: Value must be equal to or lower than [10].)'
        );
      });

      it('returns 400 when maximumCasesToOpen < 1', async () => {
        const res = await executeConnector({
          supertest,
          connectorId,
          req: getRequest({ maximumCasesToOpen: 0 }),
        });

        expect(res.status).to.be('error');
        expect(res.serviceMessage).to.be(
          'Request validation failed (Error: [maximumCasesToOpen]: Value must be equal to or greater than [1].)'
        );
      });
    });

    describe('execution', () => {
      describe('Without grouping', () => {
        const req = getRequest();

        it('should create an oracle record correctly', async () => {
          await executeConnectorAndVerifyCorrectness({
            supertest,
            connectorId,
            req,
          });

          const oracleRecord = await getOracleRecord({
            kibanaServer,
            oracleId: generateOracleId({ ruleId: req.params.subActionParams.rule.id }),
          });

          expect(oracleRecord.counter).to.be(1);
          expect(oracleRecord.rules[0]).to.eql({ id: req.params.subActionParams.rule.id });
        });

        it('should increase the oracle counter when the case is closed', async () => {
          const reqClosedCase = getRequest({ reopenClosedCases: false });

          const theCase = await createCaseWithId({
            kibanaServer,
            caseId: generateCaseId({ ruleId: reqClosedCase.params.subActionParams.rule.id }),
          });

          const closedCase = await updateCase({
            supertest,
            params: {
              cases: [
                { id: theCase.id, version: theCase.version ?? '', status: CaseStatuses.closed },
              ],
            },
          });

          expect(closedCase[0].status).to.be('closed');

          await executeConnectorAndVerifyCorrectness({
            supertest,
            connectorId,
            req: reqClosedCase,
          });

          const oracleRecord = await getOracleRecord({
            kibanaServer,
            oracleId: generateOracleId({ ruleId: req.params.subActionParams.rule.id }),
          });

          expect(oracleRecord.counter).to.be(2);
        });

        it('should increase the counter when the time window has elapsed', async () => {
          const reqTimeWindow = getRequest({ timeWindow: '7d' });
          const oracleId = generateOracleId({ ruleId: req.params.subActionParams.rule.id });

          await createOracleRecord({
            es,
            oracleId,
            attributes: { date: '2024-02-10T11:00:00.000Z' },
          });

          await executeConnectorAndVerifyCorrectness({
            supertest,
            connectorId,
            req: reqTimeWindow,
          });

          const oracleRecord = await getOracleRecord({
            kibanaServer,
            oracleId,
          });

          expect(oracleRecord.counter).to.be(2);
        });

        it('should not create another oracle record if it exists', async () => {
          const oracleId = generateOracleId({ ruleId: req.params.subActionParams.rule.id });

          await executeConnectorAndVerifyCorrectness({
            supertest,
            connectorId,
            req,
          });

          await executeConnectorAndVerifyCorrectness({
            supertest,
            connectorId,
            req,
          });

          const records = await getAllOracleRecords({
            kibanaServer,
          });

          expect(records.total).to.be(1);
          expect(records.records[0].id).to.eql(oracleId);

          return true;
        });

        it('should create a case correctly', async () => {
          await executeConnectorAndVerifyCorrectness({ supertest, connectorId, req });

          const cases = await findCases({ supertest });
          expect(cases.total).to.be(1);
        });

        it('should create a case with the correct ID', async () => {
          await executeConnectorAndVerifyCorrectness({ supertest, connectorId, req });

          const cases = await findCases({ supertest });
          expect(cases.total).to.be(1);

          const theCase = cases.cases[0];

          expect(theCase.id).to.be(generateCaseId({ ruleId: req.params.subActionParams.rule.id }));
        });

        it('should create a case with the correct attributes', async () => {
          await executeConnectorAndVerifyCorrectness({ supertest, connectorId, req });

          const cases = await findCases({ supertest });
          expect(cases.total).to.be(1);

          const theCase = removeServerGeneratedData(cases.cases[0]);

          expect(theCase).to.eql({
            assignees: [],
            category: null,
            closed_at: null,
            closed_by: null,
            comments: [],
            connector: {
              fields: null,
              id: 'none',
              name: 'none',
              type: '.none',
            },
            created_by: {
              email: null,
              full_name: null,
              username: 'elastic',
            },
            customFields: [],
            description:
              'This case is auto-created by [Test rule](https://example.com/rules/rule-test-id). \n\n Grouping:',
            duration: null,
            external_service: null,
            id: 'ee06877e50151293e75cd6c5bd81812c15c25be55ed970f91c6f7dc40e1eafa6',
            owner: 'securitySolutionFixture',
            settings: {
              syncAlerts: false,
            },
            severity: 'low',
            status: 'open',
            tags: ['auto-generated', 'rule:rule-test-id', 'rule', 'test'],
            title: 'Test rule (Auto-created)',
            totalAlerts: 5,
            totalComment: 0,
            updated_by: {
              email: null,
              full_name: null,
              username: 'elastic',
            },
          });
        });

        it('should reopen a closed case', async () => {
          const reqClosedCase = getRequest({ reopenClosedCases: true });

          const theCase = await createCaseWithId({
            kibanaServer,
            caseId: generateCaseId({ ruleId: reqClosedCase.params.subActionParams.rule.id }),
          });

          const closedCase = await updateCase({
            supertest,
            params: {
              cases: [
                { id: theCase.id, version: theCase.version ?? '', status: CaseStatuses.closed },
              ],
            },
          });

          expect(closedCase[0].status).to.be('closed');

          await executeConnectorAndVerifyCorrectness({
            supertest,
            connectorId,
            req: reqClosedCase,
          });

          const updatedCase = await getCase({ supertest, caseId: theCase.id });
          expect(updatedCase.status).to.be('open');
        });

        it('should create an new case when the time window has elapsed and attach alerts correctly', async () => {
          const reqTimeWindow = getRequest({ timeWindow: '7d' });
          const oracleId = generateOracleId({ ruleId: req.params.subActionParams.rule.id });

          await createOracleRecord({
            es,
            oracleId,
            attributes: { date: '2024-02-10T11:00:00.000Z' },
          });

          const theCase = await createCaseWithId({
            kibanaServer,
            caseId: generateCaseId({ ruleId: reqTimeWindow.params.subActionParams.rule.id }),
          });

          const closedCase = await updateCase({
            supertest,
            params: {
              cases: [
                { id: theCase.id, version: theCase.version ?? '', status: CaseStatuses.closed },
              ],
            },
          });

          expect(closedCase[0].status).to.be('closed');

          await executeConnectorAndVerifyCorrectness({
            supertest,
            connectorId,
            req: reqTimeWindow,
          });

          const oldCase = await getCase({ supertest, caseId: theCase.id });

          expect(oldCase.status).to.be('closed');

          const newCase = await getCase({
            supertest,
            caseId: generateCaseId({
              ruleId: reqTimeWindow.params.subActionParams.rule.id,
              counter: 2,
            }),
          });

          expect(newCase.status).to.be('open');

          const attachments = await getAllComments({ supertest, caseId: newCase.id });

          verifyAlertsAttachedToCase({
            caseAttachments: attachments,
            expectedAlertIdsToBeAttachedToCase: new Set(
              req.params.subActionParams.alerts.map((alert) => alert._id)
            ),
            rule: {
              id: req.params.subActionParams.rule.id,
              name: req.params.subActionParams.rule.name,
            },
          });
        });

        it('should not create a new case if it exists', async () => {
          const theCase = await createCaseWithId({
            kibanaServer,
            caseId: generateCaseId({ ruleId: req.params.subActionParams.rule.id }),
          });

          await executeConnectorAndVerifyCorrectness({ supertest, connectorId, req });

          const cases = await findCases({ supertest });
          expect(cases.total).to.be(1);

          expect(theCase.id).to.be(cases.cases[0].id);
        });

        it('should create the correct case if the oracle record exists', async () => {
          const oracleId = generateOracleId({
            ruleId: req.params.subActionParams.rule.id,
          });

          await createOracleRecord({ es, oracleId, attributes: { counter: 3 } });
          const caseId = generateCaseId({ ruleId: req.params.subActionParams.rule.id, counter: 3 });

          await executeConnectorAndVerifyCorrectness({ supertest, connectorId, req });

          const cases = await findCases({ supertest });
          expect(cases.total).to.be(1);

          expect(caseId).to.be(cases.cases[0].id);
        });

        it('should attach the correct number of alerts', async () => {
          await executeConnectorAndVerifyCorrectness({ supertest, connectorId, req });
          const cases = await findCases({ supertest });
          expect(cases.total).to.be(1);

          const theCase = cases.cases[0];

          expect(theCase.totalAlerts).to.be(req.params.subActionParams.alerts.length);
        });

        it('should attach the correct alerts', async () => {
          await executeConnectorAndVerifyCorrectness({ supertest, connectorId, req });
          const cases = await findCases({ supertest });
          expect(cases.total).to.be(1);

          const theCase = cases.cases[0];

          const attachments = await getAllComments({ supertest, caseId: theCase.id });

          verifyAlertsAttachedToCase({
            caseAttachments: attachments,
            expectedAlertIdsToBeAttachedToCase: new Set(
              req.params.subActionParams.alerts.map((alert) => alert._id)
            ),
            rule: {
              id: req.params.subActionParams.rule.id,
              name: req.params.subActionParams.rule.name,
            },
          });
        });

        it('create case with custom fields correctly', async () => {
          const customFields = {
            customFields: [
              { key: 'text_1', label: 'text 1', type: CustomFieldTypes.TEXT, required: true },
            ],
          };

          await createConfiguration(
            supertest,
            getConfigurationRequest({
              overrides: customFields,
            })
          );

          await executeConnectorAndVerifyCorrectness({ supertest, connectorId, req });

          const cases = await findCases({ supertest });
          expect(cases.total).to.be(1);
          expect(cases.cases[0].customFields).to.eql([
            { key: 'text_1', type: CustomFieldTypes.TEXT, value: 'N/A' },
          ]);
        });

        it('should add more alerts to the same case', async () => {
          const alerts = Array.from(Array(5).keys()).map((index) => ({
            _id: `alert-id-new-${index}`,
            _index: 'alert-index-0',
          }));

          await executeConnectorAndVerifyCorrectness({ supertest, connectorId, req });

          const cases = await findCases({ supertest });
          expect(cases.total).to.be(1);

          await executeConnectorAndVerifyCorrectness({
            supertest,
            connectorId,
            req: getRequest({ alerts }),
          });

          const theCase = cases.cases[0];

          const attachments = await getAllComments({ supertest, caseId: theCase.id });

          verifyAlertsAttachedToCase({
            caseAttachments: attachments,
            expectedAlertIdsToBeAttachedToCase: new Set([
              ...req.params.subActionParams.alerts.map((alert) => alert._id),
              ...alerts.map((alert) => alert._id),
            ]),
            rule: {
              id: req.params.subActionParams.rule.id,
              name: req.params.subActionParams.rule.name,
            },
          });
        });

        it('should attach the alerts to an existing case', async () => {
          const theCase = await createCaseWithId({
            kibanaServer,
            caseId: generateCaseId({ ruleId: req.params.subActionParams.rule.id }),
          });

          await executeConnectorAndVerifyCorrectness({ supertest, connectorId, req });

          const cases = await findCases({ supertest });
          expect(cases.total).to.be(1);

          const attachments = await getAllComments({ supertest, caseId: theCase.id });

          verifyAlertsAttachedToCase({
            caseAttachments: attachments,
            expectedAlertIdsToBeAttachedToCase: new Set([
              ...req.params.subActionParams.alerts.map((alert) => alert._id),
            ]),
            rule: {
              id: req.params.subActionParams.rule.id,
              name: req.params.subActionParams.rule.name,
            },
          });
        });

        it('should not attach alerts to a case with more that 1K alerts and should not throw', async () => {
          const alerts = [...Array(1000).keys()].map((num) => `test-${num}`);

          const theCase = await createCaseWithId({
            kibanaServer,
            caseId: generateCaseId({ ruleId: req.params.subActionParams.rule.id }),
          });

          await createComment({
            supertest,
            caseId: theCase.id,
            params: { ...postCommentAlertReq, alertId: alerts, index: alerts },
          });

          await executeConnectorAndVerifyCorrectness({ supertest, connectorId, req });

          const cases = await findCases({ supertest });
          expect(cases.total).to.be(1);

          const attachments = await getAllComments({ supertest, caseId: theCase.id });
          expect(attachments.length).to.be(1);
          expect((attachments[0] as AlertAttachment).alertId.length).to.be(1000);
        });
      });

      describe('With grouping', () => {
        const req = getRequest({ groupingBy: ['host.name'] });

        describe('Oracle', () => {
          it('should create the oracle records correctly with grouping', async () => {
            await executeConnectorAndVerifyCorrectness({
              supertest,
              connectorId,
              req,
            });

            const firstOracleId = generateOracleId({
              ruleId: req.params.subActionParams.rule.id,
              grouping: { 'host.name': 'A' },
            });

            const secondOracleId = generateOracleId({
              ruleId: req.params.subActionParams.rule.id,
              grouping: { 'host.name': 'B' },
            });

            const firstOracleRecord = await getOracleRecord({
              kibanaServer,
              oracleId: firstOracleId,
            });

            const secondOracleRecord = await getOracleRecord({
              kibanaServer,
              oracleId: secondOracleId,
            });

            expect(firstOracleRecord.counter).to.be(1);
            expect(firstOracleRecord.rules[0]).to.eql({
              id: req.params.subActionParams.rule.id,
            });

            expect(secondOracleRecord.counter).to.be(1);
            expect(secondOracleRecord.rules[0]).to.eql({
              id: req.params.subActionParams.rule.id,
            });
          });
        });

        describe('Cases & alerts', () => {
          it('should create cases correctly', async () => {
            await executeConnectorAndVerifyCorrectness({
              supertest,
              connectorId,
              req,
            });

            const cases = await findCases({ supertest });

            expect(cases.total).to.be(2);

            const firstCaseId = generateCaseId({
              ruleId: req.params.subActionParams.rule.id,
              grouping: { 'host.name': 'A' },
            });
            const secondCaseId = generateCaseId({
              ruleId: req.params.subActionParams.rule.id,
              grouping: { 'host.name': 'B' },
            });

            const firstCase = removeServerGeneratedData(
              cases.cases.find((theCase) => theCase.id === firstCaseId)!
            );

            const secondCase = removeServerGeneratedData(
              cases.cases.find((theCase) => theCase.id === secondCaseId)!
            );

            expect(firstCase).to.eql({
              assignees: [],
              category: null,
              closed_at: null,
              closed_by: null,
              comments: [],
              connector: {
                fields: null,
                id: 'none',
                name: 'none',
                type: '.none',
              },
              created_by: {
                email: null,
                full_name: null,
                username: 'elastic',
              },
              customFields: [],
              description:
                'This case is auto-created by [Test rule](https://example.com/rules/rule-test-id). \n\n Grouping: `host.name` equals `A`',
              duration: null,
              external_service: null,
              id: firstCaseId,
              owner: 'securitySolutionFixture',
              settings: {
                syncAlerts: false,
              },
              severity: 'low',
              status: 'open',
              tags: ['auto-generated', 'rule:rule-test-id', 'host.name:A', 'rule', 'test'],
              title: 'Test rule (Auto-created)',
              totalAlerts: 3,
              totalComment: 0,
              updated_by: {
                email: null,
                full_name: null,
                username: 'elastic',
              },
            });

            expect(secondCase).to.eql({
              assignees: [],
              category: null,
              closed_at: null,
              closed_by: null,
              comments: [],
              connector: {
                fields: null,
                id: 'none',
                name: 'none',
                type: '.none',
              },
              created_by: {
                email: null,
                full_name: null,
                username: 'elastic',
              },
              customFields: [],
              description:
                'This case is auto-created by [Test rule](https://example.com/rules/rule-test-id). \n\n Grouping: `host.name` equals `B`',
              duration: null,
              external_service: null,
              id: secondCaseId,
              owner: 'securitySolutionFixture',
              settings: {
                syncAlerts: false,
              },
              severity: 'low',
              status: 'open',
              tags: ['auto-generated', 'rule:rule-test-id', 'host.name:B', 'rule', 'test'],
              title: 'Test rule (Auto-created)',
              totalAlerts: 2,
              totalComment: 0,
              updated_by: {
                email: null,
                full_name: null,
                username: 'elastic',
              },
            });
          });

          it('fallback to one case when a lot of cases will be generated', async () => {
            const alerts = Array.from(Array(10).keys()).map((index) => ({
              _id: `alert-id-${index}`,
              _index: 'alert-index-0',
              'host.name': index,
            }));

            await executeConnectorAndVerifyCorrectness({
              supertest,
              connectorId,
              req: getRequest({ groupingBy: ['host.name'], alerts }),
            });

            const cases = await findCases({ supertest });
            expect(cases.total).to.be(1);
          });

          it('should attach the alerts to the correct cases', async () => {
            await executeConnectorAndVerifyCorrectness({
              supertest,
              connectorId,
              req,
            });

            const cases = await findCases({ supertest });

            expect(cases.total).to.be(2);

            const firstCaseId = generateCaseId({
              ruleId: req.params.subActionParams.rule.id,
              grouping: { 'host.name': 'A' },
            });
            const secondCaseId = generateCaseId({
              ruleId: req.params.subActionParams.rule.id,
              grouping: { 'host.name': 'B' },
            });

            const firstCase = removeServerGeneratedData(
              cases.cases.find((theCase) => theCase.id === firstCaseId)!
            );

            const firstCaseAttachments = await getAllComments({ supertest, caseId: firstCase.id });

            verifyAlertsAttachedToCase({
              caseAttachments: firstCaseAttachments,
              expectedAlertIdsToBeAttachedToCase: new Set([
                'alert-id-0',
                'alert-id-2',
                'alert-id-4',
              ]),
              rule: {
                id: req.params.subActionParams.rule.id,
                name: req.params.subActionParams.rule.name,
              },
            });

            const secondCase = removeServerGeneratedData(
              cases.cases.find((theCase) => theCase.id === secondCaseId)!
            );

            const secondCaseAttachments = await getAllComments({
              supertest,
              caseId: secondCase.id,
            });

            verifyAlertsAttachedToCase({
              caseAttachments: secondCaseAttachments,
              expectedAlertIdsToBeAttachedToCase: new Set(['alert-id-1', 'alert-id-3']),
              rule: {
                id: req.params.subActionParams.rule.id,
                name: req.params.subActionParams.rule.name,
              },
            });
          });

          it('should add more alerts to the same case', async () => {
            const hostAAlerts = Array.from(Array(3).keys()).map((index) => ({
              _id: `alert-id-host-A-${index}`,
              _index: 'alert-index-0',
              'host.name': 'A',
            }));

            const hostBAlerts = Array.from(Array(3).keys()).map((index) => ({
              _id: `alert-id-host-B-${index}`,
              _index: 'alert-index-0',
              'host.name': 'B',
            }));

            const totalAlerts = [...hostAAlerts, ...hostBAlerts];

            await executeConnectorAndVerifyCorrectness({
              supertest,
              connectorId,
              req: getRequest({
                alerts: req.params.subActionParams.alerts,
                groupingBy: req.params.subActionParams.groupingBy,
              }),
            });

            const cases = await findCases({ supertest });
            expect(cases.total).to.be(2);

            await executeConnectorAndVerifyCorrectness({
              supertest,
              connectorId,
              req: getRequest({
                alerts: totalAlerts,
                groupingBy: req.params.subActionParams.groupingBy,
              }),
            });

            const firstCaseId = generateCaseId({
              ruleId: req.params.subActionParams.rule.id,
              grouping: { 'host.name': 'A' },
            });

            const secondCaseId = generateCaseId({
              ruleId: req.params.subActionParams.rule.id,
              grouping: { 'host.name': 'B' },
            });

            const firstCase = removeServerGeneratedData(
              cases.cases.find((theCase) => theCase.id === firstCaseId)!
            );

            const secondCase = removeServerGeneratedData(
              cases.cases.find((theCase) => theCase.id === secondCaseId)!
            );

            const firstCaseAttachments = await getAllComments({
              supertest,
              caseId: firstCase.id,
            });

            const secondCaseAttachments = await getAllComments({
              supertest,
              caseId: secondCase.id,
            });

            verifyAlertsAttachedToCase({
              caseAttachments: firstCaseAttachments,
              expectedAlertIdsToBeAttachedToCase: new Set([
                ...['alert-id-0', 'alert-id-2', 'alert-id-4'],
                ...hostAAlerts.map((alert) => alert._id),
              ]),
              rule: {
                id: req.params.subActionParams.rule.id,
                name: req.params.subActionParams.rule.name,
              },
            });

            verifyAlertsAttachedToCase({
              caseAttachments: secondCaseAttachments,
              expectedAlertIdsToBeAttachedToCase: new Set([
                ...['alert-id-1', 'alert-id-3'],
                ...hostBAlerts.map((alert) => alert._id),
              ]),
              rule: {
                id: req.params.subActionParams.rule.id,
                name: req.params.subActionParams.rule.name,
              },
            });
          });

          it('should not attach alerts that do not belong to any grouping', async () => {
            const alerts = [
              { _id: `alert-id-0`, _index: 'alert-index-0' },
              { _id: `alert-id-1`, _index: 'alert-index-0', 'host.name': 'A' },
            ];

            await executeConnectorAndVerifyCorrectness({
              supertest,
              connectorId,
              req: getRequest({
                alerts,
                groupingBy: req.params.subActionParams.groupingBy,
              }),
            });

            const cases = await findCases({ supertest });

            expect(cases.total).to.be(1);
            const theCase = cases.cases[0];

            const attachments = await getAllComments({
              supertest,
              caseId: theCase.id,
            });

            verifyAlertsAttachedToCase({
              caseAttachments: attachments,
              expectedAlertIdsToBeAttachedToCase: new Set(['alert-id-1']),
              rule: {
                id: req.params.subActionParams.rule.id,
                name: req.params.subActionParams.rule.name,
              },
            });
          });
        });
      });
    });

    describe('rbac', () => {
      before(async () => {
        await createUsersAndRoles(getService, api_int_users, api_int_roles);
      });

      after(async () => {
        await deleteUsersAndRoles(getService, api_int_users, api_int_roles);
      });

      it('should not execute without permission to cases for all owners', async () => {
        for (const owner of ['cases', 'securitySolution', 'observability']) {
          const req = getRequest({ owner });
          await executeConnector({
            supertest: supertestWithoutAuth,
            connectorId,
            req,
            auth: { user: onlyActions, space: null },
            expectedHttpCode: 403,
          });
        }
      });

      it('should not execute in a space with no permissions', async () => {
        const req = getRequest({ owner: 'securitySolution' });
        await executeConnector({
          supertest: supertestWithoutAuth,
          connectorId,
          req,
          auth: { user: secAllSpace1User, space: 'space2' },
          expectedHttpCode: 403,
        });
      });

      it('should not execute with read permission to cases', async () => {
        for (const user of [
          globalRead,
          secAllCasesReadUser,
          obsCasesReadUser,
          obsSecCasesReadUser,
          noKibanaPrivileges,
        ]) {
          const req = getRequest({ owner: 'securitySolution' });
          await executeConnector({
            supertest: supertestWithoutAuth,
            connectorId,
            req,
            auth: { user, space: null },
            expectedHttpCode: 403,
          });
        }
      });

      it('should execute correctly for users with permissions to cases', async () => {
        const usersToTest: Array<[User, string]> = [
          [secAllUser, 'securitySolution'],
          [obsCasesAllUser, 'observability'],
          [casesAllUser, 'cases'],
          [obsSecCasesAllUser, 'securitySolution'],
          [obsSecCasesAllUser, 'observability'],
        ];

        for (const [user, owner] of usersToTest) {
          const req = getRequest({ owner });
          const res = await executeConnector({
            supertest: supertestWithoutAuth,
            connectorId,
            req,
            auth: { user, space: null },
            expectedHttpCode: 200,
          });

          expect(res.status).to.be('ok');
        }
      });

      it('should not execute when users have permission to cases but for different owners', async () => {
        const usersToTest: Array<[User, string]> = [
          [secAllUser, 'observability'],
          [obsCasesAllUser, 'securitySolution'],
          [casesAllUser, 'securitySolution'],
          [obsSecCasesAllUser, 'cases'],
          [obsSecCasesAllUser, 'cases'],
        ];

        for (const [user, owner] of usersToTest) {
          const req = getRequest({ owner });
          await executeConnector({
            supertest: supertestWithoutAuth,
            connectorId,
            req,
            auth: { user, space: null },
            expectedHttpCode: 403,
          });
        }
      });
    });
  });
};

const getRequest = (params: Partial<CasesConnectorRunParams> = {}) => {
  const alerts = [
    {
      _id: 'alert-id-0',
      _index: 'alert-index-0',
      'host.name': 'A',
      'dest.ip': '0.0.0.1',
      'source.ip': '0.0.0.2',
    },
    {
      _id: 'alert-id-1',
      _index: 'alert-index-1',
      'host.name': 'B',
      'dest.ip': '0.0.0.1',
      'file.hash': '12345',
    },
    { _id: 'alert-id-2', _index: 'alert-index-2', 'host.name': 'A', 'dest.ip': '0.0.0.1' },
    { _id: 'alert-id-3', _index: 'alert-index-3', 'host.name': 'B', 'dest.ip': '0.0.0.3' },
    { _id: 'alert-id-4', _index: 'alert-index-4', 'host.name': 'A', 'source.ip': '0.0.0.5' },
  ];

  const rule = {
    id: 'rule-test-id',
    name: 'Test rule',
    tags: ['rule', 'test'],
    ruleUrl: 'https://example.com/rules/rule-test-id',
  };

  const owner = 'securitySolutionFixture';
  const timeWindow = '7d';
  const reopenClosedCases = false;

  const req: { subAction: 'run'; subActionParams: CasesConnectorRunParams } = {
    subAction: 'run',
    subActionParams: {
      alerts,
      groupingBy: [],
      rule,
      owner,
      timeWindow,
      reopenClosedCases,
      maximumCasesToOpen: 5,
      ...params,
    },
  };

  return { params: req };
};

const generateCaseId = ({
  ruleId,
  grouping = {},
  counter = 1,
  spaceId = 'default',
  owner = 'securitySolutionFixture',
}: {
  ruleId: string;
  grouping?: Record<string, unknown>;
  counter?: number;
  spaceId?: string;
  owner?: string;
}) => {
  return generateId({ ruleId, counter, grouping, spaceId, owner });
};

const generateOracleId = ({
  ruleId,
  grouping = {},
  spaceId = 'default',
  owner = 'securitySolutionFixture',
}: {
  ruleId: string;
  grouping?: Record<string, unknown>;
  spaceId?: string;
  owner?: string;
}) => {
  return generateId({ ruleId, grouping, spaceId, owner });
};

const generateId = ({
  ruleId,
  grouping,
  counter,
  spaceId,
  owner,
}: {
  ruleId?: string;
  grouping?: Record<string, unknown>;
  counter?: number;
  spaceId?: string;
  owner?: string;
}) => {
  const payload = [ruleId, spaceId, owner, stringify(grouping), counter].filter(Boolean).join(':');
  const hash = createHash('sha256');

  hash.update(payload);
  return hash.digest('hex');
};

const removeServerGeneratedData = (
  theCase: Case
): Omit<Case, 'created_at' | 'updated_at' | 'version'> => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { created_at, updated_at, version, ...restCase } = theCase;

  return restCase;
};

const verifyAlertsAttachedToCase = ({
  expectedAlertIdsToBeAttachedToCase,
  caseAttachments,
  rule,
}: {
  expectedAlertIdsToBeAttachedToCase: Set<string>;
  caseAttachments: Attachments;
  rule: { id: string; name: string };
}) => {
  const alertsAttachedToCase = caseAttachments.filter(
    (attachment): attachment is AlertAttachment => attachment.type === AttachmentType.alert
  );

  const alertIdsAttachedToCase = new Set(alertsAttachedToCase.map((alert) => alert.alertId).flat());

  expect(alertIdsAttachedToCase.size).to.be(expectedAlertIdsToBeAttachedToCase.size);

  for (const alert of alertsAttachedToCase) {
    const alertIdAsArray = Array.isArray(alert.alertId) ? alert.alertId : [alert.alertId];
    expect(
      alertIdAsArray.every((alertId) => expectedAlertIdsToBeAttachedToCase.has(alertId))
    ).to.be(true);
    expect(alert.rule.id).to.be(rule.id);
    expect(alert.rule.name).to.be(rule.name);
  }
};

const createCaseWithId = async ({
  kibanaServer,
  caseId,
  req,
}: {
  kibanaServer: KbnClient;
  caseId: string;
  req?: Partial<CasePostRequest>;
}) => {
  const res = await kibanaServer.savedObjects.create<CasePersistedAttributes>({
    id: caseId,
    type: 'cases',
    attributes: {
      ...getPostCaseRequest(),
      ...req,
      assignees: [],
      connector: {
        name: 'none',
        type: ConnectorTypes.none,
        fields: null,
      },
      // @ts-ignore
      status: STATUS_EXTERNAL_TO_ESMODEL[req?.status ?? CaseStatuses.open],
      // @ts-ignore
      severity: SEVERITY_EXTERNAL_TO_ESMODEL[req?.severity ?? CaseSeverity.low],
      closed_at: null,
      closed_by: null,
      updated_at: null,
      updated_by: null,
      created_at: new Date().toISOString(),
      created_by: { username: 'elastic', full_name: null, email: null },
      duration: 0,
      external_service: null,
      total_alerts: 0,
      total_comments: 0,
    },
    overwrite: false,
  });

  return { id: res.id, version: res.version, ...res.attributes };
};

const getOracleRecord = async ({
  kibanaServer,
  oracleId,
}: {
  kibanaServer: KbnClient;
  oracleId: string;
}) => {
  const res = await kibanaServer.savedObjects.get<OracleRecordAttributes>({
    id: oracleId,
    type: 'cases-oracle',
  });

  return { id: res.id, version: res.version, ...res.attributes };
};

const getAllOracleRecords = async ({ kibanaServer }: { kibanaServer: KbnClient }) => {
  const res = await kibanaServer.savedObjects.find<OracleRecordAttributes>({
    type: 'cases-oracle',
  });

  return {
    total: res.total,
    records: res.saved_objects.map((so) => ({ id: so.id, version: so.version, ...so.attributes })),
  };
};

const clearOracleRecords = async (es: Client, kibanaServer: KbnClient) => {
  await kibanaServer.savedObjects.clean({ types: ['cases-oracle'] });
  await es.deleteByQuery({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    q: 'type:cases-oracle',
    wait_for_completion: true,
    refresh: true,
    body: {},
    conflicts: 'proceed',
  });
};

const executeConnectorAndVerifyCorrectness = async ({
  supertest,
  connectorId,
  req,
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  connectorId: string;
  req: Record<string, unknown>;
}) => {
  const res = await executeConnector({ supertest, connectorId, req });

  expect(res.status).to.be('ok');

  return res;
};

const createOracleRecord = async ({
  es,
  oracleId,
  attributes: { counter, date } = {},
}: {
  es: Client;
  oracleId: string;
  attributes?: { counter?: number; date?: string };
}) => {
  const creationDate = date ?? new Date().toISOString();

  await es.create({
    id: `cases-oracle:${oracleId}`,
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    document: {
      'cases-oracle': {
        createdAt: creationDate,
        updatedAt: null,
        cases: [],
        grouping: {},
        rules: [{ id: 'rule-test-id' }],
        counter: counter ?? 1,
      },
      coreMigrationVersion: '8.8.0',
      created_at: creationDate,
      managed: false,
      namespaces: ['default'],
      type: 'cases-oracle',
      typeMigrationVersion: '10.1.0',
      references: [],
    },
  });
};

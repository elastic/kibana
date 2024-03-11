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
import {
  deleteAllCaseItems,
  executeConnector,
  findCases,
  getAllComments,
  updateCase,
  getCase,
  getConfigurationRequest,
  createConfiguration,
} from '../../../../../common/lib/api';
import { getPostCaseRequest } from '../../../../../common/lib/mock';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('Case connector', () => {
    const connectorId = 'system-connector-.cases';

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await clearOracleRecords(es, kibanaServer);
    });

    describe('validation', () => {});

    describe('execution', () => {
      const req = getRequest();

      describe('Oracle', () => {
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

        it('should increase the counter when the case is closed', async () => {
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

          await createOracleRecord({ es, oracleId });

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
      });

      describe('Case & alerts', () => {
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

          await createOracleRecord({ es, oracleId });

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

      describe('With grouping', () => {
        const reqWithGrouping = getRequest({ groupingBy: ['host.name'] });

        describe('Oracle', () => {
          it('should create the oracle records correctly with grouping', async () => {
            await executeConnectorAndVerifyCorrectness({
              supertest,
              connectorId,
              req: reqWithGrouping,
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
            expect(firstOracleRecord.rules[0]).to.eql({ id: req.params.subActionParams.rule.id });

            expect(secondOracleRecord.counter).to.be(1);
            expect(secondOracleRecord.rules[0]).to.eql({ id: req.params.subActionParams.rule.id });
          });
        });

        describe('Case creation', () => {
          it('should create cases correctly', async () => {
            await executeConnectorAndVerifyCorrectness({
              supertest,
              connectorId,
              req: reqWithGrouping,
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
        });

        describe('Alerts', () => {
          it('should attach the alerts to the correct cases', async () => {
            await executeConnectorAndVerifyCorrectness({
              supertest,
              connectorId,
              req: reqWithGrouping,
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
        });
      });
    });

    describe('rbac', () => {});
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
  counter?: number;
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

const verifyAlertsAttachedToCase = async ({
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

  expect(alertsAttachedToCase.length).to.be(expectedAlertIdsToBeAttachedToCase.size);

  for (const alert of alertsAttachedToCase) {
    expect(expectedAlertIdsToBeAttachedToCase.has(alert.alertId[0])).to.be(true);
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

const createOracleRecord = async ({ es, oracleId }: { es: Client; oracleId: string }) => {
  await es.create({
    id: `cases-oracle:${oracleId}`,
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    document: {
      'cases-oracle': {
        createdAt: '2024-02-10T11:00:00.000Z',
        updatedAt: '2024-02-10T11:00:00.000Z',
        cases: [],
        grouping: {},
        rules: [{ id: 'rule-test-id' }],
        counter: 1,
      },
      coreMigrationVersion: '8.8.0',
      created_at: '2024-02-10T11:00:00.000Z',
      managed: false,
      namespaces: ['default'],
      type: 'cases-oracle',
      typeMigrationVersion: '10.1.0',
      updated_at: '2024-02-10T11:00:00.000Z',
    },
  });
};

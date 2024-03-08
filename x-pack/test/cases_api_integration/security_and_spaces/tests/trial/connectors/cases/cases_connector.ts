/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { createHash } from 'node:crypto';
import stringify from 'json-stable-stringify';
import { CasesConnectorRunParams } from '@kbn/cases-plugin/server/connectors/cases/types';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { AlertAttachment, Case } from '@kbn/cases-plugin/common/types/domain';
import {
  deleteAllCaseItems,
  executeConnector,
  findCases,
  getAllComments,
} from '../../../../../common/lib/api';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('Case connector', () => {
    const connectorId = 'system-connector-.cases';

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

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('Without grouping', () => {
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
        },
      };

      it('should create a case correctly', async () => {
        const res = await executeConnector({ supertest, connectorId, req: { params: req } });

        expect(res.status).to.be('ok');
        const cases = await findCases({ supertest });
        expect(cases.total).to.be(1);
      });

      it('should create a case with the correct ID', async () => {
        const res = await executeConnector({ supertest, connectorId, req: { params: req } });
        expect(res.status).to.be('ok');
        const cases = await findCases({ supertest });
        expect(cases.total).to.be(1);

        const theCase = cases.cases[0];

        expect(theCase.id).to.be(generateCaseId({ ruleId: rule.id }));
      });

      it('should create a case with the correct attributes', async () => {
        const res = await executeConnector({ supertest, connectorId, req: { params: req } });
        expect(res.status).to.be('ok');
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

      it('should attach the correct number of alerts', async () => {
        const res = await executeConnector({ supertest, connectorId, req: { params: req } });
        expect(res.status).to.be('ok');
        const cases = await findCases({ supertest });
        expect(cases.total).to.be(1);

        const theCase = cases.cases[0];

        expect(theCase.totalAlerts).to.be(alerts.length);
      });

      it('should attach the correct alerts', async () => {
        const res = await executeConnector({ supertest, connectorId, req: { params: req } });
        expect(res.status).to.be('ok');
        const cases = await findCases({ supertest });
        expect(cases.total).to.be(1);

        const theCase = cases.cases[0];

        const attachments = await getAllComments({ supertest, caseId: theCase.id });
        const alertsAttachments = attachments.filter(
          (attachment): attachment is AlertAttachment => attachment.type === AttachmentType.alert
        );

        expect(alertsAttachments.length).to.be(alerts.length);

        for (const alert of alertsAttachments) {
          const foundAlert = alerts.find((_alert) => _alert._id === alert.alertId[0]);

          expect(foundAlert?._index).to.be(alert.index[0]);
          expect(alert.rule.id).to.be(rule.id);
          expect(alert.rule.name).to.be(rule.name);
        }
      });
    });

    describe('With grouping', () => {
      const req: { subAction: 'run'; subActionParams: CasesConnectorRunParams } = {
        subAction: 'run',
        subActionParams: {
          alerts,
          groupingBy: ['host.name'],
          rule,
          owner,
          timeWindow,
          reopenClosedCases,
          maximumCasesToOpen: 5,
        },
      };

      it('should create cases correctly', async () => {
        const res = await executeConnector({ supertest, connectorId, req: { params: req } });

        expect(res.status).to.be('ok');
        const cases = await findCases({ supertest });

        expect(cases.total).to.be(2);

        const firstCaseId = generateCaseId({ ruleId: rule.id, grouping: { 'host.name': 'A' } });
        const secondCaseId = generateCaseId({ ruleId: rule.id, grouping: { 'host.name': 'B' } });

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
    });
  });
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
  const payload = [ruleId, spaceId, owner, stringify(grouping), counter].filter(Boolean).join(':');
  const hash = createHash('sha256');

  hash.update(payload);
  return hash.digest('hex');
};

const removeServerGeneratedData = (theCase: Case): Partial<Case> => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { created_at, updated_at, version, ...restCase } = theCase;

  return restCase;
};

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
import { deleteAllCaseItems, executeConnector, findCases } from '../../../../../common/lib/api';
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

    describe.only('Without grouping', () => {
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
        console.log(res);
        expect(res.status).to.be('ok');
        const cases = await findCases({ supertest });
        console.log(cases);
        expect(cases.total).to.be(1);

        const theCase = cases.cases[0];

        console.log(generateCaseId({ ruleId: rule.id }));
        expect(theCase.id).to.be(generateCaseId({ ruleId: rule.id }));
      });
    });

    describe('With grouping', () => {});
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

  console.log('our payload', payload);
  hash.update(payload);
  return hash.digest('hex');
};

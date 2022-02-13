/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  createCase,
  deleteAllCaseItems,
  getCaseMetrics,
  updateCase,
} from '../../../../common/lib/utils';
import { ConnectorTypes } from '../../../../../../plugins/cases/common/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('case connector metrics', () => {
    const actionsRemover = new ActionsRemover(supertest);
    const jiraConnector = {
      id: 'jira',
      name: 'Jira',
      type: ConnectorTypes.jira as const,
      fields: { issueType: 'Task', priority: 'High', parent: null },
    };

    const snConnector = {
      id: 'sn',
      name: 'SN',
      type: ConnectorTypes.serviceNowITSM as const,
      fields: {
        urgency: '2',
        impact: '2',
        severity: '2',
        category: 'software',
        subcategory: 'os',
      },
    };

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await actionsRemover.removeAll();
    });

    describe('total connectors', () => {
      const expectConnectorsToBe = async (caseId: string, expectedConnectors: number) => {
        const metrics = await getCaseMetrics({
          supertest,
          caseId,
          features: ['connectors'],
        });

        expect(metrics).to.eql({
          connectors: {
            total: expectedConnectors,
          },
        });
      };

      it('returns zero total connectors for a case with no connectors attached', async () => {
        const theCase = await createCase(supertest, getPostCaseRequest());
        await expectConnectorsToBe(theCase.id, 0);
      });

      it('takes into account the connector from the create_case user action', async () => {
        const theCase = await createCase(
          supertest,
          getPostCaseRequest({
            connector: jiraConnector,
          })
        );
        await expectConnectorsToBe(theCase.id, 1);
      });

      it('returns the correct total number of connectors', async () => {
        const theCase = await createCase(supertest, getPostCaseRequest());

        /**
         * We update the case three times to create three user actions
         * Each user action created is of type connector.
         * Although we have three user actions the metric
         * should return two total connectors
         * as the third update changes the fields
         * of the Jira connector and does not adds
         * a new connector.
         */
        let patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: theCase.id,
                version: theCase.version,
                connector: jiraConnector,
              },
            ],
          },
        });

        patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: theCase.id,
                version: patchedCases[0].version,
                connector: snConnector,
              },
            ],
          },
        });

        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: theCase.id,
                version: patchedCases[0].version,
                connector: { ...jiraConnector, fields: { ...jiraConnector.fields, urgency: '1' } },
              },
            ],
          },
        });

        await expectConnectorsToBe(theCase.id, 2);
      });
    });
  });
};

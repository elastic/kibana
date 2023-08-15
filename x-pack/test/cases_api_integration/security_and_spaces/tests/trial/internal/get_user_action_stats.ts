/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import expect from '@kbn/expect';

import { ConnectorTypes } from '@kbn/cases-plugin/common/types/domain';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseReq } from '../../../../common/lib/mock';
import {
  createCaseWithConnector,
  createConnector,
  getJiraConnector,
  getServiceNowSimulationServer,
  getCaseUserActionStats,
  createCase,
  deleteAllCaseItems,
  pushCase,
  updateCase,
} from '../../../../common/lib/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const actionsRemover = new ActionsRemover(supertest);

  describe('get_case_user_action_stats', () => {
    let serviceNowSimulatorURL: string = '';
    let serviceNowServer: http.Server;

    before(async () => {
      const { server, url } = await getServiceNowSimulationServer();
      serviceNowServer = server;
      serviceNowSimulatorURL = url;
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await actionsRemover.removeAll();
    });

    after(async () => {
      serviceNowServer.close();
    });

    it('connectors are counted in total_other_actions', async () => {
      const [{ postedCase, connector: serviceNowConnector }, jiraConnector] = await Promise.all([
        createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
        }),
        createConnector({
          supertest,
          req: {
            ...getJiraConnector(),
          },
        }),
      ]);

      actionsRemover.add('default', jiraConnector.id, 'action', 'actions');

      const theCase = await pushCase({
        supertest,
        caseId: postedCase.id,
        connectorId: serviceNowConnector.id,
      });

      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: theCase.id,
              version: theCase.version,
              connector: {
                id: jiraConnector.id,
                name: 'Jira',
                type: ConnectorTypes.jira,
                fields: { issueType: 'Task', priority: null, parent: null },
              },
            },
          ],
        },
      });

      const userActionTotals = await getCaseUserActionStats({ supertest, caseID: theCase.id });

      expect(userActionTotals.total).to.equal(3);
      expect(userActionTotals.total_comments).to.equal(0);
      expect(userActionTotals.total_other_actions).to.equal(3);
      expect(userActionTotals.total).to.equal(
        userActionTotals.total_comments + userActionTotals.total_other_actions
      );
    });

    it('assignees are counted in total_other_actions', async () => {
      // 1 creation action
      const theCase = await createCase(supertest, postCaseReq);

      // 1 assignee action
      await updateCase({
        supertest,
        params: {
          cases: [
            {
              assignees: [
                {
                  uid: '123',
                },
              ],
              id: theCase.id,
              version: theCase.version,
            },
          ],
        },
      });

      const userActionTotals = await getCaseUserActionStats({ supertest, caseID: theCase.id });

      expect(userActionTotals.total).to.equal(2);
      expect(userActionTotals.total_comments).to.equal(0);
      expect(userActionTotals.total_other_actions).to.equal(2);
      expect(userActionTotals.total).to.equal(
        userActionTotals.total_comments + userActionTotals.total_other_actions
      );
    });
  });
};

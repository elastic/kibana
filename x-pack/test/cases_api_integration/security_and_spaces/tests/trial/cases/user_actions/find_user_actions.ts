/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import expect from '@kbn/expect';
import { ActionTypes } from '@kbn/cases-plugin/common/api';
import { getPostCaseRequest } from '../../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  updateCase,
  pushCase,
  createCaseWithConnector,
  getServiceNowSimulationServer,
  findCaseUserActions,
} from '../../../../../common/lib/api';

import { ObjectRemover as ActionsRemover } from '../../../../../../alerting_api_integration/common/lib';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const actionsRemover = new ActionsRemover(supertest);

  describe('find_user_actions', () => {
    let serviceNowSimulatorURL: string = '';
    let serviceNowServer: http.Server;

    before(async () => {
      const { url, server } = await getServiceNowSimulationServer();
      serviceNowSimulatorURL = url;
      serviceNowServer = server;
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await actionsRemover.removeAll();
    });

    after(async () => {
      serviceNowServer.close();
    });

    describe('filters using the type query parameter', () => {
      it('retrieves only the assignees user actions', async () => {
        const theCase = await createCase(supertest, getPostCaseRequest());

        await updateCase({
          params: {
            cases: [
              {
                id: theCase.id,
                version: theCase.version,
                assignees: [
                  {
                    uid: '123',
                  },
                ],
              },
            ],
          },
          supertest,
        });

        const response = await findCaseUserActions({
          caseID: theCase.id,
          supertest,
          options: {
            sortOrder: 'asc',
            types: [ActionTypes.assignees],
          },
        });

        expect(response.userActions.length).to.be(1);

        const addAssigneesUserAction = response.userActions[0];
        expect(addAssigneesUserAction.type).to.eql('assignees');
        expect(addAssigneesUserAction.action).to.eql('add');
        expect(addAssigneesUserAction.payload).to.eql({ assignees: [{ uid: '123' }] });
      });

      it('retrieves only the pushed user actions', async () => {
        const { postedCase, connector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
        });

        const theCase = await pushCase({
          supertest,
          caseId: postedCase.id,
          connectorId: connector.id,
        });

        const response = await findCaseUserActions({
          caseID: theCase.id,
          supertest,
          options: {
            sortOrder: 'asc',
            types: [ActionTypes.pushed],
          },
        });

        expect(response.userActions.length).to.be(1);

        const pushedUserAction = response.userActions[0];
        expect(pushedUserAction.type).to.eql('pushed');
        expect(pushedUserAction.action).to.eql('push_to_service');
      });
    });
  });
};

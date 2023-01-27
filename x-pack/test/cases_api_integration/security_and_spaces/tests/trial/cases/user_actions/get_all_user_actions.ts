/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import expect from '@kbn/expect';
import { PushedUserAction, User, UserActionWithDeprecatedResponse } from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { defaultUser, getPostCaseRequest } from '../../../../../common/lib/mock';
import {
  createCase,
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  deleteConfiguration,
  pushCase,
  updateCase,
  updateConfiguration,
} from '../../../../../common/lib/utils';
import { getCaseUserActions } from '../../../../../common/lib/user_actions';
import {
  createCaseWithConnector,
  getServiceNowSimulationServer,
} from '../../../../../common/lib/connectors';

import { ObjectRemover as ActionsRemover } from '../../../../../../alerting_api_integration/common/lib';
import { setupSuperUserProfile } from '../../../../../common/lib/user_profiles';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const actionsRemover = new ActionsRemover(supertest);

  describe('get_all_user_actions', () => {
    let serviceNowSimulatorURL: string = '';
    let serviceNowServer: http.Server;

    before(async () => {
      const { server, url } = await getServiceNowSimulationServer();
      serviceNowServer = server;
      serviceNowSimulatorURL = url;
    });

    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteConfiguration(es);
      await deleteCasesUserActions(es);
      await actionsRemover.removeAll();
    });

    after(async () => {
      serviceNowServer.close();
    });

    it('creates a push to service user action', async () => {
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

      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });
      const pushUserAction = userActions[1] as UserActionWithDeprecatedResponse<PushedUserAction>;

      expect(userActions.length).to.eql(2);
      expect(pushUserAction.type).to.eql('pushed');
      expect(pushUserAction.action).to.eql('push_to_service');
      expect(pushUserAction.created_by).to.eql(defaultUser);
      expect(pushUserAction.case_id).to.eql('postedCase.id');
      expect(pushUserAction.comment_id).to.eql(null);
      expect(pushUserAction.owner).to.eql('securitySolutionFixture');
      expect(pushUserAction.payload.externalService).to.eql({
        pushed_at: theCase.external_service!.pushed_at,
        connector_id: connector.id,
        connector_name: connector.name,
        pushed_by: defaultUser,
        external_id: '123',
        external_title: 'INC01',
        external_url: `${connector.config!.apiUrl}/nav_to.do?uri=incident.do?sys_id=123`,
      });
    });

    it('creates a push to service user action and a status update user action when the case is closed after a push', async () => {
      const { postedCase, connector, configuration } = await createCaseWithConnector({
        supertest,
        serviceNowSimulatorURL,
        actionsRemover,
      });

      await updateConfiguration(supertest, configuration.id, {
        closure_type: 'close-by-pushing',
        version: configuration.version,
      });

      const theCase = await pushCase({
        supertest,
        caseId: postedCase.id,
        connectorId: connector.id,
      });

      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });
      const statusUserAction = userActions[1] as PushedUserAction;

      expect(userActions.length).to.eql(3);
      expect(statusUserAction.type).to.eql('status');
      expect(statusUserAction.action).to.eql('update');
      expect(statusUserAction.payload).to.eql({ status: 'closed' });
    });

    it('creates an add and delete assignees user action', async () => {
      const theCase = await createCase(
        supertest,
        getPostCaseRequest({ assignees: [{ uid: '1' }] })
      );
      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: theCase.id,
              version: theCase.version,
              assignees: [{ uid: '2' }, { uid: '3' }],
            },
          ],
        },
      });

      const userActions = await getCaseUserActions({ supertest, caseID: theCase.id });
      const addAssigneesUserAction = userActions[1];
      const deleteAssigneesUserAction = userActions[2];

      expect(userActions.length).to.eql(3);
      expect(addAssigneesUserAction.type).to.eql('assignees');
      expect(addAssigneesUserAction.action).to.eql('add');
      expect(addAssigneesUserAction.payload).to.eql({ assignees: [{ uid: '2' }, { uid: '3' }] });
      expect(deleteAssigneesUserAction.type).to.eql('assignees');
      expect(deleteAssigneesUserAction.action).to.eql('delete');
      expect(deleteAssigneesUserAction.payload).to.eql({ assignees: [{ uid: '1' }] });
    });

    describe('user profile uid', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      let headers: Record<string, string>;
      let superUserWithProfile: User;
      let superUserInfo: User;

      before(async () => {
        ({ headers, superUserInfo, superUserWithProfile } = await setupSuperUserProfile(
          getService
        ));
      });

      it('sets the profile uid', async () => {
        const { postedCase, connector } = await createCaseWithConnector({
          supertest: supertestWithoutAuth,
          serviceNowSimulatorURL,
          actionsRemover,
          auth: null,
          headers,
        });

        await pushCase({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          connectorId: connector.id,
          auth: null,
          headers,
        });

        const userActions = await getCaseUserActions({ supertest, caseID: postedCase.id });
        const pushUserAction = userActions[1] as UserActionWithDeprecatedResponse<PushedUserAction>;

        expect(pushUserAction.payload.externalService.pushed_by).to.eql(superUserWithProfile);
      });

      it('falls back to authc to get the user information when the profile uid is not available', async () => {
        const { postedCase, connector } = await createCaseWithConnector({
          supertest: supertestWithoutAuth,
          serviceNowSimulatorURL,
          actionsRemover,
        });

        await pushCase({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          connectorId: connector.id,
        });

        const userActions = await getCaseUserActions({ supertest, caseID: postedCase.id });
        const pushUserAction = userActions[1] as UserActionWithDeprecatedResponse<PushedUserAction>;

        expect(pushUserAction.payload.externalService.pushed_by).to.eql(superUserInfo);
      });
    });
  });
};

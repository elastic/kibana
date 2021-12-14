/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import {
  CASES_URL,
  SECURITY_SOLUTION_OWNER,
} from '../../../../../../plugins/cases/common/constants';
import { getCaseUserActions } from '../../../../common/lib/utils';
import { CaseUserActionsResponse } from '../../../../../../plugins/cases/common/api';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('migrations', () => {
    describe('7.10.0', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
      });

      it('7.10.0 migrates user actions connector', async () => {
        const { body } = await supertest
          .get(`${CASES_URL}/e1900ac0-017f-11eb-93f8-d161651bf509/user_actions`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const connectorUserAction = body[1];

        expect(connectorUserAction.type).to.be('connector');
        expect(connectorUserAction.payload).to.eql({
          connector: {
            id: 'b1900ac0-017f-11eb-93f8-d161651bf509',
            fields: null,
            name: 'none',
            type: '.none',
          },
        });
      });
    });

    describe('7.13.2', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.13.2');
      });

      it('adds the owner field', async () => {
        const userActions = await getCaseUserActions({
          supertest,
          caseID: 'e49ad6e0-cf9d-11eb-a603-13e7747d215c',
        });

        expect(userActions.length).to.not.be(0);
        for (const action of userActions) {
          expect(action.owner).to.be(SECURITY_SOLUTION_OWNER);
        }
      });
    });

    describe('7.13 connector id extraction', () => {
      let userActions: CaseUserActionsResponse;

      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/cases/migrations/7.13_user_actions'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/cases/migrations/7.13_user_actions'
        );
      });

      describe('none connector case', () => {
        it('removes the connector id from the case create user action and sets the ids to null', async () => {
          userActions = await getCaseUserActions({
            supertest,
            caseID: 'aa8ac630-005e-11ec-91f1-6daf2ab59fb5',
          });

          const userAction = getUserActionById(
            userActions,
            'ab43b5f0-005e-11ec-91f1-6daf2ab59fb5'
          )!;

          const payload = userAction.payload;
          expect(payload.description).to.be('a description');
          expect(payload.title).to.be('a case');
          expect(payload.connector.id).to.be('none');
        });

        it('sets the connector ids to null for a create user action with null new and old values', async () => {
          const userAction = getUserActionById(
            userActions,
            'b3094de0-005e-11ec-91f1-6daf2ab59fb5'
          )!;

          const payload = userAction.payload;
          expect(payload.connector.id).to.be('none');
        });
      });

      describe('case with many user actions', () => {
        before(async () => {
          userActions = await getCaseUserActions({
            supertest,
            caseID: 'e6fa9370-005e-11ec-91f1-6daf2ab59fb5',
          });
        });

        it('adds the connector id field for a created case user action', async () => {
          const userAction = getUserActionById(
            userActions,
            'e7882d70-005e-11ec-91f1-6daf2ab59fb5'
          )!;

          const payload = userAction.payload;
          expect(payload.description).to.be('a description');
          expect(payload.title).to.be('a case');
          expect(payload.connector.id).to.be('d92243b0-005e-11ec-91f1-6daf2ab59fb5');
        });

        it('adds the connector id from the external service new value', async () => {
          const userAction = getUserActionById(
            userActions,
            'e9471b80-005e-11ec-91f1-6daf2ab59fb5'
          )!;

          const externalService = userAction.payload.externalService;
          expect(externalService.connector_name).to.be('a jira connector');
          expect(externalService.connector_id).to.be('d92243b0-005e-11ec-91f1-6daf2ab59fb5');
        });

        it('adds the connector id for an update connector action', async () => {
          const userAction = getUserActionById(
            userActions,
            '16cd9e30-005f-11ec-91f1-6daf2ab59fb5'
          )!;

          const payload = userAction.payload;
          expect(payload.connector.name).to.be('a different jira connector');
          expect(payload.connector.id).to.be('0a572860-005f-11ec-91f1-6daf2ab59fb5');
        });

        it('adds the connector id from the external service new value for second push', async () => {
          const userAction = getUserActionById(
            userActions,
            '1ea33bb0-005f-11ec-91f1-6daf2ab59fb5'
          )!;

          const externalService = userAction.payload.externalService;
          expect(externalService.connector_name).to.be('a different jira connector');
          expect(externalService.connector_id).to.be('0a572860-005f-11ec-91f1-6daf2ab59fb5');
        });
      });
    });
  });
}

function getUserActionById(userActions: CaseUserActionsResponse, id: string): any {
  return userActions.find((userAction) => userAction.action_id === id);
}

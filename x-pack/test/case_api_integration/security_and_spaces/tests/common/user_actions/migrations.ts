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
import {
  CaseUserActionResponse,
  CaseUserActionsResponse,
} from '../../../../../../plugins/cases/common';

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
        const oldValue = JSON.parse(connectorUserAction.old_value);
        const newValue = JSON.parse(connectorUserAction.new_value);

        expect(connectorUserAction.action_field.length).eql(1);
        expect(connectorUserAction.action_field[0]).eql('connector');
        expect(connectorUserAction.old_val_connector_id).to.eql(
          'c1900ac0-017f-11eb-93f8-d161651bf509'
        );
        expect(oldValue).to.eql({
          name: 'none',
          type: '.none',
          fields: null,
        });
        expect(connectorUserAction.new_val_connector_id).to.eql(
          'b1900ac0-017f-11eb-93f8-d161651bf509'
        );
        expect(newValue).to.eql({
          name: 'none',
          type: '.none',
          fields: null,
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

          const newValDecoded = JSON.parse(userAction.new_value!);
          expect(newValDecoded.description).to.be('a description');
          expect(newValDecoded.title).to.be('a case');
          expect(newValDecoded.connector).not.have.property('id');
          // the connector id should be none so it should be removed
          expect(userAction.new_val_connector_id).to.be(null);
          expect(userAction.old_val_connector_id).to.be(null);
        });

        it('sets the connector ids to null for a create user action with null new and old values', async () => {
          const userAction = getUserActionById(
            userActions,
            'b3094de0-005e-11ec-91f1-6daf2ab59fb5'
          )!;

          expect(userAction.new_val_connector_id).to.be(null);
          expect(userAction.old_val_connector_id).to.be(null);
        });
      });

      describe('case with many user actions', () => {
        before(async () => {
          userActions = await getCaseUserActions({
            supertest,
            caseID: 'e6fa9370-005e-11ec-91f1-6daf2ab59fb5',
          });
        });

        it('removes the connector id field for a created case user action', async () => {
          const userAction = getUserActionById(
            userActions,
            'e7882d70-005e-11ec-91f1-6daf2ab59fb5'
          )!;

          const newValDecoded = JSON.parse(userAction.new_value!);
          expect(newValDecoded.description).to.be('a description');
          expect(newValDecoded.title).to.be('a case');

          expect(newValDecoded.connector).to.not.have.property('id');
          expect(userAction.new_val_connector_id).to.be('d92243b0-005e-11ec-91f1-6daf2ab59fb5');
          expect(userAction.old_val_connector_id).to.be(null);
        });

        it('removes the connector id from the external service new value', async () => {
          const userAction = getUserActionById(
            userActions,
            'e9471b80-005e-11ec-91f1-6daf2ab59fb5'
          )!;

          const newValDecoded = JSON.parse(userAction.new_value!);
          expect(newValDecoded.connector_name).to.be('a jira connector');
          expect(newValDecoded).to.not.have.property('connector_id');
          expect(userAction.new_val_connector_id).to.be('d92243b0-005e-11ec-91f1-6daf2ab59fb5');
          expect(userAction.old_val_connector_id).to.be(null);
        });

        it('sets the connector ids to null for a comment user action', async () => {
          const userAction = getUserActionById(
            userActions,
            'efe9de50-005e-11ec-91f1-6daf2ab59fb5'
          )!;

          const newValDecoded = JSON.parse(userAction.new_value!);
          expect(newValDecoded.comment).to.be('a comment');
          expect(userAction.new_val_connector_id).to.be(null);
          expect(userAction.old_val_connector_id).to.be(null);
        });

        it('removes the connector id for an update connector action', async () => {
          const userAction = getUserActionById(
            userActions,
            '16cd9e30-005f-11ec-91f1-6daf2ab59fb5'
          )!;

          const newValDecoded = JSON.parse(userAction.new_value!);
          const oldValDecoded = JSON.parse(userAction.old_value!);

          expect(newValDecoded.name).to.be('a different jira connector');
          expect(oldValDecoded.name).to.be('a jira connector');

          expect(newValDecoded).to.not.have.property('id');
          expect(oldValDecoded).to.not.have.property('id');
          expect(userAction.new_val_connector_id).to.be('0a572860-005f-11ec-91f1-6daf2ab59fb5');
          expect(userAction.old_val_connector_id).to.be('d92243b0-005e-11ec-91f1-6daf2ab59fb5');
        });

        it('removes the connector id from the external service new value for second push', async () => {
          const userAction = getUserActionById(
            userActions,
            '1ea33bb0-005f-11ec-91f1-6daf2ab59fb5'
          )!;

          const newValDecoded = JSON.parse(userAction.new_value!);

          expect(newValDecoded.connector_name).to.be('a different jira connector');

          expect(newValDecoded).to.not.have.property('connector_id');
          expect(userAction.new_val_connector_id).to.be('0a572860-005f-11ec-91f1-6daf2ab59fb5');
          expect(userAction.old_val_connector_id).to.be(null);
        });
      });
    });
  });
}

function getUserActionById(
  userActions: CaseUserActionsResponse,
  id: string
): CaseUserActionResponse | undefined {
  return userActions.find((userAction) => userAction.action_id === id);
}

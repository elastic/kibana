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
        expect(oldValue).to.eql({
          id: 'c1900ac0-017f-11eb-93f8-d161651bf509',
          name: 'none',
          type: '.none',
          fields: null,
        });
        expect(newValue).to.eql({
          id: 'b1900ac0-017f-11eb-93f8-d161651bf509',
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
  });
}

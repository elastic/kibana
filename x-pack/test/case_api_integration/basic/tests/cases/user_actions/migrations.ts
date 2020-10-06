/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { CASES_URL } from '../../../../../../plugins/case/common/constants';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('migrations', () => {
    before(async () => {
      await esArchiver.load('cases');
    });

    after(async () => {
      await esArchiver.unload('cases');
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
}

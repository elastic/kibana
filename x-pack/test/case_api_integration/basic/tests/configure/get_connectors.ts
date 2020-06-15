/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { CASE_CONFIGURE_CONNECTORS_URL } from '../../../../../plugins/case/common/constants';
import { ObjectRemover as ActionsRemover } from '../../../../alerting_api_integration/common/lib';
import { getServiceNowConnector, getJiraConnector } from '../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const actionsRemover = new ActionsRemover(supertest);

  describe('get_connectors', () => {
    afterEach(async () => {
      await actionsRemover.removeAll();
    });

    it('should return an empty find body correctly if no connectors are loaded', async () => {
      const { body } = await supertest
        .get(`${CASE_CONFIGURE_CONNECTORS_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body).to.eql([]);
    });

    it('should return the correct connectors', async () => {
      const { body: connectorOne } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .send(getServiceNowConnector())
        .expect(200);

      const { body: connectorTwo } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .send({
          name: 'An email action',
          actionTypeId: '.email',
          config: {
            service: '__json',
            from: 'bob@example.com',
          },
          secrets: {
            user: 'bob',
            password: 'supersecret',
          },
        })
        .expect(200);

      const { body: connectorThree } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .send(getJiraConnector())
        .expect(200);

      actionsRemover.add('default', connectorOne.id, 'action', 'actions');
      actionsRemover.add('default', connectorTwo.id, 'action', 'actions');
      actionsRemover.add('default', connectorThree.id, 'action', 'actions');

      const { body: connectors } = await supertest
        .get(`${CASE_CONFIGURE_CONNECTORS_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(connectors.length).to.equal(2);
      expect(
        connectors.some((c: { actionTypeId: string }) => c.actionTypeId === '.servicenow')
      ).to.equal(true);
      expect(connectors.some((c: { actionTypeId: string }) => c.actionTypeId === '.jira')).to.equal(
        true
      );
    });
  });
};

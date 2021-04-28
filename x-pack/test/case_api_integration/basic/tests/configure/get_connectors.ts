/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { CASE_CONFIGURE_CONNECTORS_URL } from '../../../../../plugins/cases/common/constants';
import { ObjectRemover as ActionsRemover } from '../../../../alerting_api_integration/common/lib';
import {
  getServiceNowConnector,
  getJiraConnector,
  getResilientConnector,
} from '../../../common/lib/utils';

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
      const { body: snConnector } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .send(getServiceNowConnector())
        .expect(200);

      const { body: emailConnector } = await supertest
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

      const { body: jiraConnector } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .send(getJiraConnector())
        .expect(200);

      const { body: resilientConnector } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .send(getResilientConnector())
        .expect(200);

      actionsRemover.add('default', snConnector.id, 'action', 'actions');
      actionsRemover.add('default', emailConnector.id, 'action', 'actions');
      actionsRemover.add('default', jiraConnector.id, 'action', 'actions');
      actionsRemover.add('default', resilientConnector.id, 'action', 'actions');

      const { body: connectors } = await supertest
        .get(`${CASE_CONFIGURE_CONNECTORS_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);
      expect(connectors).to.eql([
        {
          id: jiraConnector.id,
          actionTypeId: '.jira',
          name: 'Jira Connector',
          config: {
            apiUrl: 'http://some.non.existent.com',
            projectKey: 'pkey',
          },
          isPreconfigured: false,
          isMissingSecrets: false,
          referencedByCount: 0,
        },
        {
          id: resilientConnector.id,
          actionTypeId: '.resilient',
          name: 'Resilient Connector',
          config: {
            apiUrl: 'http://some.non.existent.com',
            orgId: 'pkey',
          },
          isPreconfigured: false,
          isMissingSecrets: false,
          referencedByCount: 0,
        },
        {
          id: snConnector.id,
          actionTypeId: '.servicenow',
          name: 'ServiceNow Connector',
          config: {
            apiUrl: 'http://some.non.existent.com',
          },
          isPreconfigured: false,
          isMissingSecrets: false,
          referencedByCount: 0,
        },
      ]);
    });
  });
};

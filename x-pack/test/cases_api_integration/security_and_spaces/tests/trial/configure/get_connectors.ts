/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CASE_CONFIGURE_CONNECTORS_URL } from '@kbn/cases-plugin/common/constants';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';
import {
  getServiceNowConnector,
  getJiraConnector,
  getResilientConnector,
  createConnector,
  getServiceNowSIRConnector,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const actionsRemover = new ActionsRemover(supertest);

  describe('get_connectors', () => {
    afterEach(async () => {
      await actionsRemover.removeAll();
    });

    it('should return the correct connectors', async () => {
      const { body: snConnector } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'true')
        .send(getServiceNowConnector())
        .expect(200);

      const { body: emailConnector } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'true')
        .send({
          name: 'An email action',
          connector_type_id: '.email',
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
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'true')
        .send(getJiraConnector())
        .expect(200);

      const { body: resilientConnector } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'true')
        .send(getResilientConnector())
        .expect(200);

      const sir = await createConnector({ supertest, req: getServiceNowSIRConnector() });

      actionsRemover.add('default', sir.id, 'action', 'actions');
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
          isDeprecated: false,
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
          isDeprecated: false,
          isMissingSecrets: false,
          referencedByCount: 0,
        },
        {
          id: snConnector.id,
          actionTypeId: '.servicenow',
          name: 'ServiceNow Connector',
          config: {
            apiUrl: 'http://some.non.existent.com',
            usesTableApi: false,
          },
          isPreconfigured: false,
          isDeprecated: false,
          isMissingSecrets: false,
          referencedByCount: 0,
        },
        {
          id: sir.id,
          actionTypeId: '.servicenow-sir',
          name: 'ServiceNow Connector',
          config: {
            apiUrl: 'http://some.non.existent.com',
            usesTableApi: false,
          },
          isPreconfigured: false,
          isDeprecated: false,
          isMissingSecrets: false,
          referencedByCount: 0,
        },
      ]);
    });
  });
};

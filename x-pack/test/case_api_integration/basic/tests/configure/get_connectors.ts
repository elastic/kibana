/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { CASE_CONFIGURE_CONNECTORS_URL } from '../../../../../plugins/case/common/constants';
import { ObjectRemover as ActionsRemover } from '../../../../alerting_api_integration/common/lib';
import {
  getServiceNowConnector,
  getJiraConnector,
  getResilientConnector,
  getConnectorWithoutCaseOwned,
  getConnectorWithoutMapping,
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

      const { body: connectorWithoutCaseOwned } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .send(getConnectorWithoutCaseOwned())
        .expect(200);

      const { body: connectorNoMapping } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .send(getConnectorWithoutMapping())
        .expect(200);

      actionsRemover.add('default', snConnector.id, 'action', 'actions');
      actionsRemover.add('default', emailConnector.id, 'action', 'actions');
      actionsRemover.add('default', jiraConnector.id, 'action', 'actions');
      actionsRemover.add('default', resilientConnector.id, 'action', 'actions');
      actionsRemover.add('default', connectorWithoutCaseOwned.id, 'action', 'actions');
      actionsRemover.add('default', connectorNoMapping.id, 'action', 'actions');

      const { body: connectors } = await supertest
        .get(`${CASE_CONFIGURE_CONNECTORS_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(connectors).to.eql([
        {
          id: connectorWithoutCaseOwned.id,
          actionTypeId: '.resilient',
          name: 'Connector without isCaseOwned',
          config: {
            apiUrl: 'http://some.non.existent.com',
            orgId: 'pkey',
            incidentConfiguration: {
              mapping: [
                {
                  source: 'title',
                  target: 'name',
                  actionType: 'overwrite',
                },
                {
                  source: 'description',
                  target: 'description',
                  actionType: 'overwrite',
                },
                {
                  source: 'comments',
                  target: 'comments',
                  actionType: 'append',
                },
              ],
            },
            isCaseOwned: null,
          },
          isPreconfigured: false,
          referencedByCount: 0,
        },
        {
          id: jiraConnector.id,
          actionTypeId: '.jira',
          name: 'Jira Connector',
          config: {
            apiUrl: 'http://some.non.existent.com',
            projectKey: 'pkey',
            incidentConfiguration: {
              mapping: [
                {
                  source: 'title',
                  target: 'summary',
                  actionType: 'overwrite',
                },
                {
                  source: 'description',
                  target: 'description',
                  actionType: 'overwrite',
                },
                {
                  source: 'comments',
                  target: 'comments',
                  actionType: 'append',
                },
              ],
            },
            isCaseOwned: true,
          },
          isPreconfigured: false,
          referencedByCount: 0,
        },
        {
          id: resilientConnector.id,
          actionTypeId: '.resilient',
          name: 'Resilient Connector',
          config: {
            apiUrl: 'http://some.non.existent.com',
            orgId: 'pkey',
            incidentConfiguration: {
              mapping: [
                {
                  source: 'title',
                  target: 'name',
                  actionType: 'overwrite',
                },
                {
                  source: 'description',
                  target: 'description',
                  actionType: 'overwrite',
                },
                {
                  source: 'comments',
                  target: 'comments',
                  actionType: 'append',
                },
              ],
            },
            isCaseOwned: true,
          },
          isPreconfigured: false,
          referencedByCount: 0,
        },
        {
          id: snConnector.id,
          actionTypeId: '.servicenow',
          name: 'ServiceNow Connector',
          config: {
            apiUrl: 'http://some.non.existent.com',
            incidentConfiguration: {
              mapping: [
                {
                  source: 'title',
                  target: 'short_description',
                  actionType: 'overwrite',
                },
                {
                  source: 'description',
                  target: 'description',
                  actionType: 'append',
                },
                {
                  source: 'comments',
                  target: 'comments',
                  actionType: 'append',
                },
              ],
            },
            isCaseOwned: true,
          },
          isPreconfigured: false,
          referencedByCount: 0,
        },
      ]);
    });
  });
};

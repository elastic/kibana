/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';
import {
  getServiceNowConnector,
  getServiceNowSIRConnector,
  getServiceNowOAuthConnector,
  getJiraConnector,
  getResilientConnector,
  createConnector,
  getEmailConnector,
  getCaseConnectors,
  getCasesWebhookConnector,
} from '../../../../common/lib/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const actionsRemover = new ActionsRemover(supertest);

  describe('get_connectors', () => {
    afterEach(async () => {
      await actionsRemover.removeAll();
    });

    it('should return the correct connectors', async () => {
      const snConnector = await createConnector({ supertest, req: getServiceNowConnector() });
      const snOAuthConnector = await createConnector({
        supertest,
        req: getServiceNowOAuthConnector(),
      });
      const emailConnector = await createConnector({ supertest, req: getEmailConnector() });
      const jiraConnector = await createConnector({ supertest, req: getJiraConnector() });
      const resilientConnector = await createConnector({ supertest, req: getResilientConnector() });
      const sir = await createConnector({ supertest, req: getServiceNowSIRConnector() });
      const casesWebhookConnector = await createConnector({
        supertest,
        req: getCasesWebhookConnector(),
      });

      actionsRemover.add('default', sir.id, 'action', 'actions');
      actionsRemover.add('default', snConnector.id, 'action', 'actions');
      actionsRemover.add('default', snOAuthConnector.id, 'action', 'actions');
      actionsRemover.add('default', emailConnector.id, 'action', 'actions');
      actionsRemover.add('default', jiraConnector.id, 'action', 'actions');
      actionsRemover.add('default', resilientConnector.id, 'action', 'actions');
      actionsRemover.add('default', casesWebhookConnector.id, 'action', 'actions');

      const connectors = await getCaseConnectors({ supertest });
      const sortedConnectors = connectors.sort((a, b) => a.name.localeCompare(b.name));

      expect(sortedConnectors).to.eql([
        {
          id: casesWebhookConnector.id,
          actionTypeId: '.cases-webhook',
          name: 'Cases Webhook Connector',
          config: {
            createCommentJson: '{"body":{{{case.comment}}}}',
            createCommentMethod: 'post',
            createCommentUrl: 'http://some.non.existent.com/{{{external.system.id}}}/comment',
            createIncidentJson:
              '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
            createIncidentMethod: 'post',
            createIncidentResponseKey: 'id',
            createIncidentUrl: 'http://some.non.existent.com/',
            getIncidentResponseExternalTitleKey: 'key',
            hasAuth: true,
            headers: { [`content-type`]: 'application/json' },
            viewIncidentUrl: 'http://some.non.existent.com/browse/{{{external.system.title}}}',
            getIncidentUrl: 'http://some.non.existent.com/{{{external.system.id}}}',
            updateIncidentJson:
              '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
            updateIncidentMethod: 'put',
            updateIncidentUrl: 'http://some.non.existent.com/{{{external.system.id}}}',
          },
          isPreconfigured: false,
          isDeprecated: false,
          isMissingSecrets: false,
          referencedByCount: 0,
        },
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
        /**
         * Preconfigured connectors are being registered here:
         * x-pack/test/cases_api_integration/common/config.ts
         */
        {
          actionTypeId: '.servicenow',
          id: 'preconfigured-servicenow',
          isPreconfigured: true,
          isDeprecated: false,
          name: 'preconfigured-servicenow',
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
            isOAuth: false,
            clientId: null,
            jwtKeyId: null,
            userIdentifierValue: null,
          },
          isPreconfigured: false,
          isDeprecated: false,
          isMissingSecrets: false,
          referencedByCount: 0,
        },
        {
          id: snOAuthConnector.id,
          actionTypeId: '.servicenow',
          name: 'ServiceNow OAuth Connector',
          config: {
            apiUrl: 'http://some.non.existent.com',
            usesTableApi: false,
            isOAuth: true,
            clientId: 'abc',
            userIdentifierValue: 'elastic',
            jwtKeyId: 'def',
          },
          isPreconfigured: false,
          isDeprecated: false,
          isMissingSecrets: false,
          referencedByCount: 0,
        },
        {
          id: sir.id,
          actionTypeId: '.servicenow-sir',
          name: 'ServiceNow SIR Connector',
          config: {
            apiUrl: 'http://some.non.existent.com',
            usesTableApi: false,
            isOAuth: false,
            clientId: null,
            jwtKeyId: null,
            userIdentifierValue: null,
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

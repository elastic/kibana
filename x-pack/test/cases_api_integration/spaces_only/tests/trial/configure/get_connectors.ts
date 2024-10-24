/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';
import {
  getAuthWithSuperUser,
  getActionsSpace,
  getServiceNowConnector,
  getServiceNowSIRConnector,
  getEmailConnector,
  getCaseConnectors,
  getCasesWebhookConnector,
  getServiceNowOAuthConnector,
  getJiraConnector,
  createConnector,
  getResilientConnector,
} from '../../../../common/lib/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const actionsRemover = new ActionsRemover(supertest);
  const authSpace1 = getAuthWithSuperUser();
  const space = getActionsSpace(authSpace1.space);

  describe('get_connectors', () => {
    afterEach(async () => {
      await actionsRemover.removeAll();
    });

    it('should return the correct connectors in space1', async () => {
      const snConnector = await createConnector({
        supertest: supertestWithoutAuth,
        req: getServiceNowConnector(),
        auth: authSpace1,
      });
      const snOAuthConnector = await createConnector({
        supertest: supertestWithoutAuth,
        req: getServiceNowOAuthConnector(),
        auth: authSpace1,
      });
      const emailConnector = await createConnector({
        supertest: supertestWithoutAuth,
        req: getEmailConnector(),
        auth: authSpace1,
      });

      const jiraConnector = await createConnector({
        supertest: supertestWithoutAuth,
        req: getJiraConnector(),
        auth: authSpace1,
      });

      const resilientConnector = await createConnector({
        supertest: supertestWithoutAuth,
        req: getResilientConnector(),
        auth: authSpace1,
      });

      const sir = await createConnector({
        supertest: supertestWithoutAuth,
        req: getServiceNowSIRConnector(),
        auth: authSpace1,
      });

      const casesWebhookConnector = await createConnector({
        supertest: supertestWithoutAuth,
        req: getCasesWebhookConnector(),
        auth: authSpace1,
      });

      actionsRemover.add(space, sir.id, 'action', 'actions');
      actionsRemover.add(space, snConnector.id, 'action', 'actions');
      actionsRemover.add(space, snOAuthConnector.id, 'action', 'actions');
      actionsRemover.add(space, emailConnector.id, 'action', 'actions');
      actionsRemover.add(space, jiraConnector.id, 'action', 'actions');
      actionsRemover.add(space, resilientConnector.id, 'action', 'actions');
      actionsRemover.add(space, casesWebhookConnector.id, 'action', 'actions');

      const connectors = await getCaseConnectors({
        supertest: supertestWithoutAuth,
        auth: authSpace1,
      });
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
            getIncidentMethod: 'get',
            getIncidentJson: null,
            updateIncidentJson:
              '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
            updateIncidentMethod: 'put',
            updateIncidentUrl: 'http://some.non.existent.com/{{{external.system.id}}}',
          },
          isPreconfigured: false,
          isSystemAction: false,
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
          isSystemAction: false,
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
          isSystemAction: false,
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
          isSystemAction: false,
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
          isSystemAction: false,
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
          isSystemAction: false,
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
          isSystemAction: false,
          isDeprecated: false,
          isMissingSecrets: false,
          referencedByCount: 0,
        },
      ]);
    });

    it('should not return any connectors when looking in the wrong space', async () => {
      const snConnector = await createConnector({
        supertest: supertestWithoutAuth,
        req: getServiceNowConnector(),
        auth: authSpace1,
      });

      const snOAuthConnector = await createConnector({
        supertest: supertestWithoutAuth,
        req: getServiceNowOAuthConnector(),
        auth: authSpace1,
      });

      const emailConnector = await createConnector({
        supertest: supertestWithoutAuth,
        req: getEmailConnector(),
        auth: authSpace1,
      });

      const jiraConnector = await createConnector({
        supertest: supertestWithoutAuth,
        req: getJiraConnector(),
        auth: authSpace1,
      });

      const resilientConnector = await createConnector({
        supertest: supertestWithoutAuth,
        req: getResilientConnector(),
        auth: authSpace1,
      });

      const sir = await createConnector({
        supertest: supertestWithoutAuth,
        req: getServiceNowSIRConnector(),
        auth: authSpace1,
      });

      actionsRemover.add(space, sir.id, 'action', 'actions');
      actionsRemover.add(space, snConnector.id, 'action', 'actions');
      actionsRemover.add(space, snOAuthConnector.id, 'action', 'actions');
      actionsRemover.add(space, emailConnector.id, 'action', 'actions');
      actionsRemover.add(space, jiraConnector.id, 'action', 'actions');
      actionsRemover.add(space, resilientConnector.id, 'action', 'actions');

      const connectors = await getCaseConnectors({
        supertest: supertestWithoutAuth,
        auth: getAuthWithSuperUser('space2'),
      });

      expect(connectors).to.eql([
        /**
         * Preconfigured connectors are being registered here:
         * x-pack/test/cases_api_integration/common/config.ts
         */
        {
          actionTypeId: '.servicenow',
          id: 'preconfigured-servicenow',
          isPreconfigured: true,
          isSystemAction: false,
          isDeprecated: false,
          name: 'preconfigured-servicenow',
          referencedByCount: 0,
        },
      ]);
    });
  });
};

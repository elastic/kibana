/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { createConnector, deleteAllConnectors } from '../../../../../common/utils/connectors';

import {
  getServiceNowConnector,
  getServiceNowSIRConnector,
  getServiceNowOAuthConnector,
  getJiraConnector,
  getResilientConnector,
  getEmailConnector,
  getCaseConnectors,
  getCasesWebhookConnector,
} from '../../../../common/lib/api';
import { noCasesConnectors } from '../../../../common/lib/authentication/users';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('get_connectors', () => {
    afterEach(async () => {
      await deleteAllConnectors(supertest);
    });

    it('should return the correct connectors', async () => {
      const snConnectorId = await createConnector(supertest, getServiceNowConnector());
      const snOAuthConnectorId = await createConnector(supertest, getServiceNowOAuthConnector());
      await createConnector(supertest, getEmailConnector());
      const jiraConnectorId = await createConnector(supertest, getJiraConnector());
      const resilientConnectorId = await createConnector(supertest, getResilientConnector());
      const sirId = await createConnector(supertest, getServiceNowSIRConnector());
      const casesWebhookConnectorId = await createConnector(supertest, getCasesWebhookConnector());

      const connectors = await getCaseConnectors({ supertest });

      expect(connectors.length).toBe(7);
      expect(connectors).toEqual(
        expect.arrayContaining([
          {
            id: casesWebhookConnectorId,
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
            isSystemAction: false,
            isDeprecated: false,
            isMissingSecrets: false,
            referencedByCount: 0,
          },
          {
            id: jiraConnectorId,
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
            id: resilientConnectorId,
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
            id: snConnectorId,
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
            id: snOAuthConnectorId,
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
            id: sirId,
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
        ])
      );
    });

    it('should return 403 when the user does not have access to the case connectors', async () => {
      await getCaseConnectors({
        supertest: supertestWithoutAuth,
        auth: { user: noCasesConnectors, space: null },
        expectedHttpCode: 403,
      });
    });
  });
};

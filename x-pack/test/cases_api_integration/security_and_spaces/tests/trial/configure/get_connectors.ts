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
  getJiraConnector,
  getResilientConnector,
  createConnector,
  getServiceNowSIRConnector,
  getEmailConnector,
  getCaseConnectors,
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
      const snConnector = await createConnector({ supertest, req: getServiceNowConnector() });
      const emailConnector = await createConnector({ supertest, req: getEmailConnector() });
      const jiraConnector = await createConnector({ supertest, req: getJiraConnector() });
      const resilientConnector = await createConnector({ supertest, req: getResilientConnector() });
      const sir = await createConnector({ supertest, req: getServiceNowSIRConnector() });

      actionsRemover.add('default', sir.id, 'action', 'actions');
      actionsRemover.add('default', snConnector.id, 'action', 'actions');
      actionsRemover.add('default', emailConnector.id, 'action', 'actions');
      actionsRemover.add('default', jiraConnector.id, 'action', 'actions');
      actionsRemover.add('default', resilientConnector.id, 'action', 'actions');

      const connectors = await getCaseConnectors({ supertest });

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
        /**
         * Preconfigured connectors are being registered here:
         * x-pack/test/cases_api_integration/common/config.ts
         */
        {
          actionTypeId: '.servicenow',
          id: 'preconfigured-servicenow',
          isPreconfigured: true,
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
          isMissingSecrets: false,
          referencedByCount: 0,
        },
      ]);
    });
  });
};

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
  getCaseConnectors,
  createConnector,
  getServiceNowConnector,
  getJiraConnector,
  getResilientConnector,
  getServiceNowSIRConnector,
  getWebhookConnector,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const actionsRemover = new ActionsRemover(supertest);

  describe('get_connectors', () => {
    afterEach(async () => {
      await actionsRemover.removeAll();
    });

    it('should return an empty find body correctly if no connectors are loaded', async () => {
      const connectors = await getCaseConnectors(supertest);
      expect(connectors).to.eql([]);
    });

    it('should return case owned connectors', async () => {
      const sn = await createConnector(supertest, getServiceNowConnector());
      actionsRemover.add('default', sn.id, 'action', 'actions');

      const jira = await createConnector(supertest, getJiraConnector());
      actionsRemover.add('default', jira.id, 'action', 'actions');

      const resilient = await createConnector(supertest, getResilientConnector());
      actionsRemover.add('default', resilient.id, 'action', 'actions');

      const sir = await createConnector(supertest, getServiceNowSIRConnector());
      actionsRemover.add('default', sir.id, 'action', 'actions');

      // Should not be returned when getting the connectors
      const webhook = await createConnector(supertest, getWebhookConnector());
      actionsRemover.add('default', webhook.id, 'action', 'actions');

      const connectors = await getCaseConnectors(supertest);
      expect(connectors).to.eql([
        {
          id: jira.id,
          actionTypeId: '.jira',
          name: 'Jira Connector',
          config: { apiUrl: 'http://some.non.existent.com', projectKey: 'pkey' },
          isPreconfigured: false,
          referencedByCount: 0,
        },
        {
          id: resilient.id,
          actionTypeId: '.resilient',
          name: 'Resilient Connector',
          config: { apiUrl: 'http://some.non.existent.com', orgId: 'pkey' },
          isPreconfigured: false,
          referencedByCount: 0,
        },
        {
          id: sn.id,
          actionTypeId: '.servicenow',
          name: 'ServiceNow Connector',
          config: { apiUrl: 'http://some.non.existent.com' },
          isPreconfigured: false,
          referencedByCount: 0,
        },
        {
          id: sir.id,
          actionTypeId: '.servicenow-sir',
          name: 'ServiceNow Connector',
          config: { apiUrl: 'http://some.non.existent.com' },
          isPreconfigured: false,
          referencedByCount: 0,
        },
      ]);
    });

    it.skip('filters out connectors that are not enabled in license', async () => {
      // TODO: Should find a way to downgrade license to gold and upgrade back to trial
    });
  });
};

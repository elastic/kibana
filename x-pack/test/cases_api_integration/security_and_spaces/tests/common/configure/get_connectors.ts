/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import {
  createConnector,
  getCaseConnectors,
  getServiceNowConnector,
  getWebhookConnector,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  /**
   * Preconfigured connectors are being registered here:
   * x-pack/test/cases_api_integration/common/config.ts
   */
  describe('get_connectors', () => {
    it('should return only supported connectors including preconfigured connectors', async () => {
      await createConnector({ supertest, req: getServiceNowConnector() });
      await createConnector({ supertest, req: getWebhookConnector() });
      const connectors = await getCaseConnectors({ supertest });

      expect(connectors).to.eql([
        {
          actionTypeId: '.servicenow',
          id: 'preconfigured-servicenow',
          isPreconfigured: true,
          name: 'preconfigured-servicenow',
          referencedByCount: 0,
        },
        {
          actionTypeId: '.servicenow',
          config: {
            apiUrl: 'http://some.non.existent.com',
            usesTableApi: false,
          },
          id: '35e75fd0-bfbe-11ec-b200-cdb35f39b10d',
          isMissingSecrets: false,
          isPreconfigured: false,
          name: 'ServiceNow Connector',
          referencedByCount: 0,
        },
      ]);
    });
  });
};

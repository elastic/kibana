/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createRegisteredConnectorTypeTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  // This test is intended to fail when new connector types are registered.
  // To resolve, add the new connector type ID to this list. This will trigger
  // a CODEOWNERS review by Response Ops.
  describe('check registered connector types', () => {
    it('should list all registered connector types', async () => {
      const registeredConnectorTypes = await supertest
        .get('/api/alerts_fixture/registered_connector_types')
        .expect(200)
        .then((response) => response.body);

      expect(
        registeredConnectorTypes
          .filter((connectorType: string) => !connectorType.startsWith('test.'))
          .sort()
      ).to.eql(
        [
          '.d3security',
          '.email',
          '.index',
          '.inference',
          '.pagerduty',
          '.swimlane',
          '.server-log',
          '.slack',
          '.slack_api',
          '.webhook',
          '.cases-webhook',
          '.xmatters',
          '.servicenow',
          '.servicenow-sir',
          '.servicenow-itom',
          '.jira',
          '.observability-ai-assistant',
          '.resilient',
          '.teams',
          '.thehive',
          '.tines',
          '.torq',
          '.opsgenie',
          '.gen-ai',
          '.bedrock',
          '.gemini',
          '.sentinelone',
          '.cases',
          '.crowdstrike',
          '.microsoft_defender_endpoint',
        ].sort()
      );
    });
  });
}

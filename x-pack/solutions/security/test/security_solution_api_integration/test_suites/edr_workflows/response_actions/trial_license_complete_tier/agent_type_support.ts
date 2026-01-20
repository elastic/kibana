/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISOLATE_HOST_ROUTE_V2 } from '@kbn/security-solution-plugin/common/endpoint/constants';
import TestAgent from 'supertest/lib/agent';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  describe('@ess @serverless Response Actions support for sentinelOne agentType', function () {
    const utils = getService('securitySolutionUtils');

    let adminSupertest: TestAgent;
    before(async () => {
      adminSupertest = await utils.createSuperTest();
    });

    describe('and the "responseActionsSentinelOneV1Enabled" feature flag is enabled', () => {
      it('should not return feature disabled error, but a connector not found error', async () => {
        await adminSupertest
          .post(ISOLATE_HOST_ROUTE_V2)
          .set('kbn-xsrf', 'true')
          .set('Elastic-Api-Version', '2023-10-31')
          .send({ endpoint_ids: ['test'], agent_type: 'sentinel_one' })
          .expect(400, {
            statusCode: 400,
            error: 'Bad Request',
            message: 'No stack connector instance configured for [.sentinelone]',
          });
      });
    });
  });
}

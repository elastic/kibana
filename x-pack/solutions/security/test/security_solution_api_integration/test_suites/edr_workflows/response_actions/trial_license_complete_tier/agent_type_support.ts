/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISOLATE_HOST_ROUTE_V2 } from '@kbn/security-solution-plugin/common/endpoint/constants';
import type TestAgent from 'supertest/lib/agent';
import expect from '@kbn/expect';
import { createSupertestErrorLogger } from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  describe('@ess @serverless @serverlessQA Response Actions support for sentinelOne agentType', function () {
    const utils = getService('securitySolutionUtils');
    const log = getService('log');

    let adminSupertest: TestAgent;
    before(async () => {
      adminSupertest = await utils.createSuperTest();
    });

    it('should not return feature disabled error, but a connector not found error', async () => {
      const { body } = await adminSupertest
        .post(ISOLATE_HOST_ROUTE_V2)
        .set('kbn-xsrf', 'true')
        .set('Elastic-Api-Version', '2023-10-31')
        .on('error', createSupertestErrorLogger(log).ignoreCodes([404]))
        .send({ endpoint_ids: ['test'], agent_type: 'sentinel_one' })
        .expect(404);

      expect(body.message).to.match(/No stack connector instance configured for/);
    });
  });
}

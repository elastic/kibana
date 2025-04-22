/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureSpaceIdExists } from '@kbn/security-solution-plugin/scripts/endpoint/common/spaces';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const rolesUsersProvider = getService('rolesUsersProvider');
  const policyTestResources = getService('endpointPolicyTestResources');
  const kbnServer = getService('kibanaServer');
  const log = getService('log');

  describe('@ess @skipInServerless, @skipInServerlessMKI Response actions space awareness support', () => {
    const afterEachDataCleanup: Array<{ cleanup: () => Promise<void> }> = [];
    const spaceOneId = 'space_one';
    const spaceTwoId = 'space_two';

    before(async () => {
      await Promise.all([
        ensureSpaceIdExists(kbnServer, spaceOneId, { log }),
        ensureSpaceIdExists(kbnServer, spaceTwoId, { log }),
      ]);
    });
  });
}

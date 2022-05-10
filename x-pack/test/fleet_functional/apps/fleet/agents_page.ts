/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { agentsPage } = getPageObjects(['agentsPage']);

  describe('When in the Fleet application', function () {
    describe('and on the agents page', () => {
      before(async () => {
        await agentsPage.navigateToAgentsPage();
      });

      it('should show the agents tab', async () => {
        await agentsPage.agentsTabExistsOrFail();
      });

      it('should show the agent policies tab', async () => {
        await agentsPage.agentPoliciesTabExistsOrFail();
      });

      it('should show the enrollment tokens tab', async () => {
        await agentsPage.enrollmentTokensTabExistsOrFail();
      });

      it('should show the data streams tab', async () => {
        await agentsPage.dataStreamsTabExistsOrFail();
      });
    });
  });
}

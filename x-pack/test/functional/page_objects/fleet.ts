/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../ftr_provider_context';

export async function FleetPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async clickAgentsTab() {
      await testSubjects.find('fleet-agents-tab');
      await retry.waitFor('add a fleet server header to be visible', async () => {
        return await testSubjects.isDisplayed('addFleetServerHeading');
      });
    },
    async clickAdvanceTab() {
      await testSubjects.click('fleetServerFlyoutTab-advanced');
      await retry.waitFor('create a policy header', async () => {
        return await testSubjects.isDisplayed('createPolicyFleetHeader');
      });
    },
  };
}

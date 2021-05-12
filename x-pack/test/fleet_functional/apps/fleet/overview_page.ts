/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { overviewPage } = getPageObjects(['overviewPage']);

  describe('When in the Fleet application', function () {
    this.tags(['ciGroup7']);

    describe('and on the Overview page', () => {
      before(async () => {
        await overviewPage.navigateToOverview();
      });

      it('should show the Integrations section', async () => {
        await overviewPage.integrationsSectionExistsOrFail();
      });

      it('should show the Agents section', async () => {
        await overviewPage.agentSectionExistsOrFail();
      });

      it('should show the Agent policies section', async () => {
        await overviewPage.agentPolicySectionExistsOrFail();
      });

      it('should show the Data streams section', async () => {
        await overviewPage.datastreamSectionExistsOrFail();
      });
    });
  });
}

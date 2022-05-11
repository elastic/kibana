/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTEGRATIONS_PLUGIN_ID } from '@kbn/fleet-plugin/common';

// NOTE: import path below should be the deep path to the actual module - else we get CI errors
import { pagePathGetters } from '@kbn/fleet-plugin/public/constants/page_paths';
import { FtrProviderContext } from '../ftr_provider_context';

export function FleetIntegrations({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');

  return {
    async navigateToIntegrationDetails(pkgkey: string) {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        INTEGRATIONS_PLUGIN_ID,
        pagePathGetters.integration_details_overview({ pkgkey })[1]
      );
    },

    async integrationDetailCustomTabExistsOrFail() {
      await testSubjects.existOrFail('tab-custom');
    },

    async findIntegrationDetailCustomTab() {
      return await testSubjects.find('tab-custom');
    },
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { PLUGIN_ID } from '../../../plugins/fleet/common';

// NOTE: import path below should be the deep path to the actual module - else we get CI errors
import { pagePathGetters } from '../../../plugins/fleet/public/constants/page_paths';

export function FleetIntegrations({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');

  return {
    async navigateToIntegrationDetails(pkgkey: string) {
      await pageObjects.common.navigateToApp(PLUGIN_ID, {
        hash: pagePathGetters.integration_details_overview({ pkgkey }),
      });
    },

    async integrationDetailCustomTabExistsOrFail() {
      await testSubjects.existOrFail('tab-custom');
    },

    async findIntegrationDetailCustomTab() {
      return await testSubjects.find('tab-custom');
    },
  };
}

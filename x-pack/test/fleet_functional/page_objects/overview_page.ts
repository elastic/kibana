/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { PLUGIN_ID } from '../../../plugins/fleet/common';

// NOTE: import path below should be the deep path to the actual module - else we get CI errors
import { pagePathGetters } from '../../../plugins/fleet/public/applications/fleet/constants/page_paths';

export function OverviewPage({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');

  return {
    async navigateToOverview() {
      await pageObjects.common.navigateToApp(PLUGIN_ID, {
        hash: pagePathGetters.overview(),
      });
    },

    async integrationsSectionExistsOrFail() {
      await testSubjects.existOrFail('fleet-integrations-section');
    },

    async agentPolicySectionExistsOrFail() {
      await testSubjects.existOrFail('fleet-agent-policy-section');
    },

    async agentSectionExistsOrFail() {
      await testSubjects.existOrFail('fleet-agent-section');
    },

    async datastreamSectionExistsOrFail() {
      await testSubjects.existOrFail('fleet-datastream-section');
    },
  };
}

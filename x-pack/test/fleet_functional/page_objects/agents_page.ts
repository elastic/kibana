/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLUGIN_ID } from '@kbn/fleet-plugin/common';

// NOTE: import path below should be the deep path to the actual module - else we get CI errors
import { pagePathGetters } from '@kbn/fleet-plugin/public/constants/page_paths';
import { FtrProviderContext } from '../ftr_provider_context';

export function AgentsPage({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');

  return {
    async navigateToAgentsPage() {
      await pageObjects.common.navigateToApp(PLUGIN_ID, {
        // Fleet's "/" route should redirect to "/agents"
        hash: pagePathGetters.base()[1],
      });
    },

    async agentsTabExistsOrFail() {
      await testSubjects.existOrFail('fleet-agents-tab');
    },

    async agentPoliciesTabExistsOrFail() {
      await testSubjects.existOrFail('fleet-agent-policies-tab');
    },

    async enrollmentTokensTabExistsOrFail() {
      await testSubjects.existOrFail('fleet-enrollment-tokens-tab');
    },

    async dataStreamsTabExistsOrFail() {
      await testSubjects.existOrFail('fleet-datastreams-tab');
    },
  };
}

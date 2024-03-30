/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function SvlManagementPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    // API keys card
    async assertApiKeysManagementCardExists() {
      await testSubjects.existOrFail('app-card-api_keys');
    },
    async assertApiKeysManagementCardDoesNotExist() {
      await testSubjects.missingOrFail('app-card-api_keys');
    },
    async clickApiKeysManagementCard() {
      await testSubjects.click('app-card-api_keys');
    },

    // Roles card
    async assertRoleManagementCardExists() {
      await testSubjects.existOrFail('app-card-roles');
    },
    async assertRoleManagementCardDoesNotExist() {
      await testSubjects.missingOrFail('app-card-roles');
    },
    async clickRoleManagementCard() {
      await testSubjects.click('app-card-roles');
    },

    // Organization members card
    async assertOrgMembersManagementCardExists() {
      await testSubjects.existOrFail('app-card-organization_members');
    },
    async assertOrgMembersManagementCardDoesNotExist() {
      await testSubjects.missingOrFail('app-card-organization_members');
    },
    async clickOrgMembersManagementCard() {
      await testSubjects.click('app-card-organization_members');
    },
  };
}

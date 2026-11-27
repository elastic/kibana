/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, SecurityPageObjects } from '@kbn/scout-security';
import { createLazyPageObject } from '@kbn/scout-security';
import { PolicyDetailsUnsavedChangesModal } from './policy_details_unsaved_changes_modal';
import { ProtectionUpdatesPage } from './protection_updates';

export interface PolicyPageObjects extends SecurityPageObjects {
  protectionUpdates: ProtectionUpdatesPage;
  policyDetailsUnsavedChangesModal: PolicyDetailsUnsavedChangesModal;
}

export const extendPageObjects = (
  pageObjects: SecurityPageObjects,
  page: ScoutPage
): PolicyPageObjects => ({
  ...pageObjects,
  protectionUpdates: createLazyPageObject(ProtectionUpdatesPage, page),
  policyDetailsUnsavedChangesModal: createLazyPageObject(PolicyDetailsUnsavedChangesModal, page),
});

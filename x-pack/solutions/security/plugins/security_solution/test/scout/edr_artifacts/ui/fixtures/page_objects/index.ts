/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, SecurityPageObjects } from '@kbn/scout-security';
import { createLazyPageObject } from '@kbn/scout-security';
import { PolicyArtifactsPage } from './policy_artifacts';
import { PolicyDetailsPage } from './policy_details';

export type { PolicyArtifactKind } from './policy_artifacts';

export interface ArtifactTabPageObjects extends SecurityPageObjects {
  policyDetailsPage: PolicyDetailsPage;
  policyArtifactsPage: PolicyArtifactsPage;
}

export const extendPageObjects = (
  pageObjects: SecurityPageObjects,
  page: ScoutPage
): ArtifactTabPageObjects => ({
  ...pageObjects,
  policyDetailsPage: createLazyPageObject(PolicyDetailsPage, page),
  policyArtifactsPage: createLazyPageObject(PolicyArtifactsPage, page),
});

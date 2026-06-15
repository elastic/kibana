/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  buildEpicPhasesStepCommonDefinition,
  buildRelationshipsStepCommonDefinition,
  listGithubProjectsToSyncStepCommonDefinition,
  seedReferenceDataStepCommonDefinition,
  setupIndicesStepCommonDefinition,
  syncGithubOrgCatalogStepCommonDefinition,
  syncGithubProjectsStepCommonDefinition,
  syncReleaseCalendarSlackStepCommonDefinition,
  syncReleaseCalendarSpreadsheetStepCommonDefinition,
} from '../../common/steps/sdlc_steps';

export const setupIndicesStepDefinition = createPublicStepDefinition({
  ...setupIndicesStepCommonDefinition,
});

export const seedReferenceDataStepDefinition = createPublicStepDefinition({
  ...seedReferenceDataStepCommonDefinition,
});

export const syncGithubProjectsStepDefinition = createPublicStepDefinition({
  ...syncGithubProjectsStepCommonDefinition,
});

export const listGithubProjectsToSyncStepDefinition = createPublicStepDefinition({
  ...listGithubProjectsToSyncStepCommonDefinition,
});

export const syncGithubOrgCatalogStepDefinition = createPublicStepDefinition({
  ...syncGithubOrgCatalogStepCommonDefinition,
});

export const buildEpicPhasesStepDefinition = createPublicStepDefinition({
  ...buildEpicPhasesStepCommonDefinition,
});

export const buildRelationshipsStepDefinition = createPublicStepDefinition({
  ...buildRelationshipsStepCommonDefinition,
});

export const syncReleaseCalendarSlackStepDefinition = createPublicStepDefinition({
  ...syncReleaseCalendarSlackStepCommonDefinition,
});

export const syncReleaseCalendarSpreadsheetStepDefinition = createPublicStepDefinition({
  ...syncReleaseCalendarSpreadsheetStepCommonDefinition,
});

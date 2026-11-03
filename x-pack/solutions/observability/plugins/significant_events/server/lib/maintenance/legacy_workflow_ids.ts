/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../common/constants';

/**
 * The id of the continuous onboarding workflow, as `@kbn/workflows/managed` names it. Kept here so
 * reading maintenance state does not load the managed workflow definitions (a task pod reads it
 * without them); `managed_workflow_targets.test.ts` checks the two agree.
 */
export const CONTINUOUS_ONBOARDING_WORKFLOW_ID_LITERAL = 'system-streams-ki-continuous-onboarding';

/**
 * Workflows that used to be installed in the default space only; their snapshots are dropped.
 * TODO: remove with the legacy default-space cleanup.
 * https://github.com/elastic/kibana/issues/294271
 */
export const LEGACY_DEFAULT_SPACE_WORKFLOW_IDS: readonly string[] = [
  CONTINUOUS_ONBOARDING_WORKFLOW_ID_LITERAL,
  LEGACY_CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
];

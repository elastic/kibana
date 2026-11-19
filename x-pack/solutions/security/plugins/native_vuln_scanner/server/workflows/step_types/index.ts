/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { buildFetchFeedStepDefinition } from './fetch_feed/fetch_feed_step';
import { buildMatchStepDefinition } from './match/match_step';
import { buildSummarizeStepDefinition } from './summarize/summarize_step';
import type { StepDeps } from './deps';

export type { StepDeps } from './deps';

export const registerNativeVulnScannerSteps = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  deps: StepDeps
): void => {
  workflowsExtensions.registerStepDefinition(buildFetchFeedStepDefinition(deps));
  workflowsExtensions.registerStepDefinition(buildMatchStepDefinition(deps));
  workflowsExtensions.registerStepDefinition(buildSummarizeStepDefinition(deps));
};

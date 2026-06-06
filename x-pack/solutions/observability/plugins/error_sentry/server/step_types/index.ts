/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { collectLogPatternsStepDefinition } from './collect_log_patterns';
import {
  getCreateGithubIssueStepDefinition,
  type CreateGithubIssueStepDeps,
} from './create_github_issue';

export const registerStepDefinitions = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  deps: CreateGithubIssueStepDeps
) => {
  workflowsExtensions.registerStepDefinition(collectLogPatternsStepDefinition);
  workflowsExtensions.registerStepDefinition(getCreateGithubIssueStepDefinition(deps));
};

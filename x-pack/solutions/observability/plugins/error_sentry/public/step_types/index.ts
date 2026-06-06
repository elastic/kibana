/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

export const registerStepDefinitions = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
) => {
  workflowsExtensions.registerStepDefinition(() =>
    import('./collect_log_patterns').then((m) => m.collectLogPatternsStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(() =>
    import('./create_github_issue').then((m) => m.createGithubIssueStepDefinition)
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

/**
 * Registers the scanner's step types with the editor so its strict-schema validation accepts
 * `native_vuln.*` steps. Loaders are lazy: the schemas load only when the editor asks for them.
 */
export const registerNativeVulnScannerWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void => {
  workflowsExtensions.registerStepDefinition(async () =>
    import('./fetch_feed').then((m) => m.fetchFeedStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(async () =>
    import('./match').then((m) => m.matchStepDefinition)
  );
  workflowsExtensions.registerStepDefinition(async () =>
    import('./summarize').then((m) => m.summarizeStepDefinition)
  );
};

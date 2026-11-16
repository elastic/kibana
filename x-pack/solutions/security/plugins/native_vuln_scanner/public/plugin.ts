/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import { registerNativeVulnScannerWorkflowSteps } from './workflows/step_types/register_workflow_steps';
import type {
  NativeVulnScannerPublicSetup,
  NativeVulnScannerPublicSetupDeps,
  NativeVulnScannerPublicStart,
} from './types';

export class NativeVulnScannerPublicPlugin
  implements
    Plugin<
      NativeVulnScannerPublicSetup,
      NativeVulnScannerPublicStart,
      NativeVulnScannerPublicSetupDeps
    >
{
  public setup(_core: CoreSetup, { workflowsExtensions }: NativeVulnScannerPublicSetupDeps) {
    registerNativeVulnScannerWorkflowSteps(workflowsExtensions);
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}

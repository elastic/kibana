/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

export type NativeVulnScannerServerSetup = Record<string, never>;

export type NativeVulnScannerServerStart = Record<string, never>;

export interface NativeVulnScannerSetupDeps {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
}

export interface NativeVulnScannerStartDeps {
  licensing: LicensingPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  fleet?: FleetStartContract;
}

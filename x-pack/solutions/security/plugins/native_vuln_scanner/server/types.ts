/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

export type NativeVulnScannerServerSetup = Record<string, never>;

export type NativeVulnScannerServerStart = Record<string, never>;

export interface NativeVulnScannerSetupDeps {
  taskManager: TaskManagerSetupContract;
}

export interface NativeVulnScannerStartDeps {
  taskManager: TaskManagerStartContract;
}

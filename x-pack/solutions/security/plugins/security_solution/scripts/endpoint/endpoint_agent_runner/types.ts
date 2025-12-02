/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { SupportedVmManager } from '../common/types';

export interface StartRuntimeServicesOptions {
  kibanaUrl: string;
  elasticUrl: string;
  fleetServerUrl?: string;
  username: string;
  password: string;
  spaceId?: string;
  apiKey?: string;
  version?: string;
  policy?: string;
  log?: ToolingLog;
  asSuperuser?: boolean;
  /** The type of VM manager to use. Defaults to 'multipass' (or 'vagrant' in CI) */
  vmType?: SupportedVmManager;
}

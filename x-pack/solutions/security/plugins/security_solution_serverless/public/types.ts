/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import type {
  PluginSetup as SecuritySolutionPluginSetup,
  PluginStart as SecuritySolutionPluginStart,
} from '@kbn/security-solution-plugin/public';
import type { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import type { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { DiscoverSetup } from '@kbn/discover-plugin/public';
import type { AutomaticImportPluginStart } from '@kbn/automatic-import-plugin/public';
import type { ServerlessSecurityConfigSchema } from '../common/config';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SecuritySolutionServerlessPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SecuritySolutionServerlessPluginStart {}

export interface SecuritySolutionServerlessPluginSetupDeps {
  security: SecurityPluginSetup;
  securitySolution: SecuritySolutionPluginSetup;
  serverless: ServerlessPluginSetup;
  management: ManagementSetup;
  discover: DiscoverSetup;
}

export interface SecuritySolutionServerlessPluginStartDeps {
  security: SecurityPluginStart;
  securitySolution: SecuritySolutionPluginStart;
  serverless: ServerlessPluginStart;
  management: ManagementStart;
  cloud: CloudStart;
  automaticImport?: AutomaticImportPluginStart;
}

export type ServerlessSecurityPublicConfig = Pick<
  ServerlessSecurityConfigSchema,
  'productTypes' | 'enableExperimental'
>;

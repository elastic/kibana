/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { NightshiftInvestigationsClient } from './client/investigations_client';

export interface NightshiftInvestigationsServerSetup {}

export interface NightshiftInvestigationsServerStart {
  getClient: (request: KibanaRequest) => NightshiftInvestigationsClient;
}

export interface NightshiftInvestigationsSetupDeps {
  workflowsExtensions?: import('@kbn/workflows-extensions/server').WorkflowsExtensionsServerPluginSetup;
  workflowsManagement?: import('@kbn/workflows-management-plugin/server').WorkflowsServerPluginSetup;
}

export interface NightshiftInvestigationsStartDeps {
  spaces?: import('@kbn/spaces-plugin/server').SpacesPluginStart;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { NightshiftInvestigationsClient } from '../client/investigations_client';
import type { CortexPageStore } from '../cortex/page_store';
import type { SandboxSecretsClient } from '../sandbox_secrets';
import type { DecisionTreeStore } from '../decision_trees/store';
import type { MemoryPageStore } from '../memory/page_store';
import type { GetTriggerEmitter } from '../types';

export type GetInvestigationsClient = (
  request: KibanaRequest,
  spaceId?: string
) => NightshiftInvestigationsClient;

export type GetAlertsClient = (request: KibanaRequest) => Promise<AlertsClient> | undefined;

export type GetAutomationsSoClient = (
  request: KibanaRequest,
  spaceId: string
) => SavedObjectsClientContract;

export type GetWorkflowsManagement = () => WorkflowsServerPluginSetup | undefined;

export type GetCortexPageStore = (request: KibanaRequest) => CortexPageStore;

export type GetDecisionTreeStore = (request: KibanaRequest) => DecisionTreeStore;

/**
 * Deliberately not request-scoped: the Semantic Memory index is hidden and has
 * no end-user index privileges, so these routes read through Kibana's internal
 * client while still deriving Space tenancy from the request.
 */
export type GetMemoryPageStore = (request: KibanaRequest) => MemoryPageStore;

export interface NightshiftInvestigationsRouteHandlerResources
  extends DefaultRouteHandlerResources {
  getInvestigationsClient: GetInvestigationsClient;
  getTriggerEmitter: GetTriggerEmitter;
  getAlertsClient: GetAlertsClient;
  getAutomationsSoClient: GetAutomationsSoClient;
  getWorkflowsManagement: GetWorkflowsManagement;
  getCortexPageStore: GetCortexPageStore;
  isCortexEnabled: () => boolean;
  sandboxSecretsClient: SandboxSecretsClient;
  getDecisionTreeStore: GetDecisionTreeStore;
  isDecisionTreesEnabled: () => boolean;
  getMemoryPageStore: GetMemoryPageStore;
  isMemoryEnabled: () => boolean;
}

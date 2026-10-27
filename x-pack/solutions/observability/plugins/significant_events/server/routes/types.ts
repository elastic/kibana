/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { InferenceClient } from '@kbn/inference-common';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import type { SignificantEventsTuningConfig } from '@kbn/significant-events-schema';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import type { IUiSettingsClient } from '@kbn/core/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { SourceKnowledgeStateClient } from '../lib/knowledge_indicators/source_knowledge_state';
import type { SignificantEventsAlertingContext } from '../lib/significant_events/alerting/significant_events_alerting_context';
import type { SignificantEventsServer } from '../types';
import type { EbtTelemetryClient } from '../lib/telemetry/ebt';
import type { KnowledgeIndicatorClient } from '../lib/knowledge_indicators';

import type { SignificantEventsClients } from '../lib/significant_events/significant_events_clients';
import type { ContinuousOnboardingWorkflowService } from '../lib/workflows/continuous_onboarding_workflow';
import type { CleanupWorkflowService } from '../lib/workflows/cleanup_workflow';
import type { SyncWorkflowService } from '../lib/workflows/sync_workflow';
import type { SignificantEventsScheduledWorkflowsService } from '../lib/workflows/significant_events_scheduled_workflows';
import type { WorkflowClients } from '../lib/workflows/create_workflow_clients';
import type { SignificantEventsMaintenanceService } from '../lib/maintenance/maintenance_service';
import type { PriceService } from '../lib/cost/price_service';

export type GetScopedClients = (params: {
  request: KibanaRequest;
}) => Promise<RouteHandlerScopedClients>;

/** Options of `scheduleSourceOnboarding`. */
export interface IScheduleSourceOnboardingOptions {
  /** Schedules even when continuous onboarding is off; for the one-time run of a source change. */
  ignoreContinuousSetting?: boolean;
}

export interface RouteHandlerScopedClients extends SignificantEventsClients {
  scopedClusterClient: IScopedClusterClient;
  /**
   * Client for reading *source* data, always routed across every CPS-linked project regardless of
   * the active space's project routing expression. Use it whenever the target is a source's ES|QL
   * view, which may resolve to a remote project. Everything the plugin owns (its
   * hidden data streams) lives in the origin project and must keep using `scopedClusterClient`.
   */
  streamDataEsClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  /** Request space (`request.spaceId`); knowledge indicators and their rules are scoped to it. */
  space: string;
  getSignificantEventsAlertingContext: () => Promise<SignificantEventsAlertingContext>;
  getKnowledgeIndicatorClient: (source?: NightshiftSource) => Promise<KnowledgeIndicatorClient>;
  sourceKnowledgeState: SourceKnowledgeStateClient;
  /**
   * Starts onboarding for a source revision; resolves to whether a run was started. Skipped for a
   * disabled source, a paused maintenance state and, unless `ignoreContinuousSetting` is set,
   * while continuous onboarding is off.
   */
  scheduleSourceOnboarding: (
    source: NightshiftSource,
    options?: IScheduleSourceOnboardingOptions
  ) => Promise<boolean>;
  getAlertEventsClient: () => Promise<AlertEventsClientApi>;
  inferenceClient: InferenceClient;
  licensing: LicensingPluginStart;
  uiSettingsClient: IUiSettingsClient;
  globalUiSettingsClient: IUiSettingsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
  sourcesClient: SourcesClient;
  isSecurityEnabled: boolean;
  tuningConfig: SignificantEventsTuningConfig;
}

export type SignificantEventsRouteHandlerResources = {
  server: SignificantEventsServer;
  telemetry: EbtTelemetryClient;
  getScopedClients: GetScopedClients;
  continuousOnboardingWorkflowService?: ContinuousOnboardingWorkflowService;
  cleanupWorkflowService?: CleanupWorkflowService;
  syncWorkflowService?: SyncWorkflowService;
  significantEventsScheduledWorkflowsService?: SignificantEventsScheduledWorkflowsService;
  workflowClients: WorkflowClients;
  maintenanceService: SignificantEventsMaintenanceService;
  priceService: PriceService;
  getSpaceId: (request: KibanaRequest) => Promise<string>;
} & DefaultRouteHandlerResources;

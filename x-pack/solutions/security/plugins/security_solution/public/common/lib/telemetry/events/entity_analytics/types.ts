/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';
import type { RiskSeverity } from '../../../../../../common/search_strategy';

export enum EntityEventTypes {
  EntityDetailsClicked = 'Entity Details Clicked',
  EntityAlertsClicked = 'Entity Alerts Clicked',
  EntityRiskFiltered = 'Entity Risk Filtered',
  EntityStoreEnablementToggleClicked = 'Entity Store Enablement Toggle Clicked',
  EntityStoreDashboardInitButtonClicked = 'Entity Store Initialization Button Clicked',
  ToggleRiskSummaryClicked = 'Toggle Risk Summary Clicked',
  AddRiskInputToTimelineClicked = 'Add Risk Input To Timeline Clicked',
  RiskInputsExpandedFlyoutOpened = 'Risk Inputs Expanded Flyout Opened',
  AssetCriticalityCsvPreviewGenerated = 'Asset Criticality Csv Preview Generated',
  AssetCriticalityFileSelected = 'Asset Criticality File Selected',
  AssetCriticalityCsvImported = 'Asset Criticality CSV Imported',
  AnomaliesCountClicked = 'Anomalies Count Clicked',
  MLJobUpdate = 'ML Job Update',
}

export enum ML_JOB_TELEMETRY_STATUS {
  started = 'started',
  startError = 'start_error',
  stopped = 'stopped',
  stopError = 'stop_error',
  moduleInstalled = 'module_installed',
  installationError = 'installationError',
}
interface EntityParam {
  entity: 'host' | 'user';
}

type ReportEntityDetailsClickedParams = EntityParam;
type ReportEntityAlertsClickedParams = EntityParam;
interface ReportEntityRiskFilteredParams extends Partial<EntityParam> {
  selectedSeverity: RiskSeverity;
}

interface ReportToggleRiskSummaryClickedParams extends EntityParam {
  action: 'show' | 'hide';
}

type ReportRiskInputsExpandedFlyoutOpenedParams = EntityParam;

interface ReportAddRiskInputToTimelineClickedParams {
  quantity: number;
}

interface ReportAssetCriticalityFileSelectedParams {
  valid: boolean;
  errorCode?: string;
  file: {
    size: number;
  };
}

interface ReportAssetCriticalityCsvPreviewGeneratedParams {
  file: {
    size: number;
  };
  processing: {
    startTime: string;
    endTime: string;
    tookMs: number;
  };
  stats: {
    validLines: number;
    invalidLines: number;
    totalLines: number;
  };
}

interface ReportAssetCriticalityCsvImportedParams {
  file: {
    size: number;
  };
}

interface ReportAnomaliesCountClickedParams {
  jobId: string;
  count: number;
}

interface ReportEntityStoreEnablementParams {
  timestamp: string;
  action: 'start' | 'stop';
}

interface ReportEntityStoreInitParams {
  timestamp: string;
}

interface ReportMLJobUpdateParams {
  jobId: string;
  isElasticJob: boolean;
  status: ML_JOB_TELEMETRY_STATUS;
  moduleId?: string;
  errorMessage?: string;
}

export interface EntityAnalyticsTelemetryEventsMap {
  [EntityEventTypes.EntityDetailsClicked]: ReportEntityDetailsClickedParams;
  [EntityEventTypes.EntityAlertsClicked]: ReportEntityAlertsClickedParams;
  [EntityEventTypes.EntityRiskFiltered]: ReportEntityRiskFilteredParams;
  [EntityEventTypes.EntityStoreEnablementToggleClicked]: ReportEntityStoreEnablementParams;
  [EntityEventTypes.EntityStoreDashboardInitButtonClicked]: ReportEntityStoreInitParams;
  [EntityEventTypes.ToggleRiskSummaryClicked]: ReportToggleRiskSummaryClickedParams;
  [EntityEventTypes.AddRiskInputToTimelineClicked]: ReportAddRiskInputToTimelineClickedParams;
  [EntityEventTypes.RiskInputsExpandedFlyoutOpened]: ReportRiskInputsExpandedFlyoutOpenedParams;
  [EntityEventTypes.AssetCriticalityCsvPreviewGenerated]: ReportAssetCriticalityCsvPreviewGeneratedParams;
  [EntityEventTypes.AssetCriticalityFileSelected]: ReportAssetCriticalityFileSelectedParams;
  [EntityEventTypes.AssetCriticalityCsvImported]: ReportAssetCriticalityCsvImportedParams;
  [EntityEventTypes.AnomaliesCountClicked]: ReportAnomaliesCountClickedParams;
  [EntityEventTypes.MLJobUpdate]: ReportMLJobUpdateParams;
}

export interface EntityAnalyticsTelemetryEvent {
  eventType: EntityEventTypes;
  schema: RootSchema<EntityAnalyticsTelemetryEventsMap[EntityEventTypes]>;
}

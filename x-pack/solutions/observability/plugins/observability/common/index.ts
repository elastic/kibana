/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export type { AsDuration, AsPercent, TimeUnitChar, TimeFormatter } from './utils/formatters';

export {
  formatDurationFromTimeUnitChar,
  asPercent,
  getDurationFormatter,
  asDuration,
  asDynamicBytes,
  asAbsoluteDateTime,
  asInteger,
} from './utils/formatters';
export { getInspectResponse } from './utils/get_inspect_response';
export { getAlertDetailsUrl, getAlertUrl } from './utils/alerting/alert_url';
export { convertToBuiltInComparators } from './utils/convert_legacy_outside_comparator';
export { ProcessorEvent } from './processor_event';

export {
  enableInspectEsQueries,
  maxSuggestions,
  enableComparisonByDefault,
  defaultApmServiceEnvironment,
  apmProgressiveLoading,
  apmServiceInventoryOptimizedSorting,
  apmServiceGroupMaxNumberOfServices,
  apmTraceExplorerTab,
  apmLabsButton,
  enableInfrastructureProfilingIntegration,
  enableInfrastructureAssetCustomDashboards,
  enableAwsLambdaMetrics,
  enableAgentExplorerView,
  apmEnableTableSearchBar,
  entityCentricExperience,
  apmAWSLambdaPriceFactor,
  apmAWSLambdaRequestCostPerMillion,
  apmEnableServiceMetrics,
  apmEnableContinuousRollups,
  enableCriticalPath,
  syntheticsThrottlingEnabled,
  apmEnableProfilingIntegration,
  profilingShowErrorFrames,
  profilingCo2PerKWH,
  profilingDatacenterPUE,
  profilingPervCPUWattX86,
  profilingPervCPUWattArm64,
  profilingAWSCostDiscountRate,
  profilingCostPervCPUPerHour,
  profilingAzureCostDiscountRate,
  apmEnableTransactionProfiling,
  apmEnableServiceInventoryTableSearchBar,
  profilingFetchTopNFunctionsFromStacktraces,
} from './ui_settings_keys';

export {
  ProgressiveLoadingQuality,
  getProbabilityFromProgressiveLoadingQuality,
} from './progressive_loading';

/** @deprecated deprecated in 8.17. Please use casesFeatureIdV2 instead */
export const casesFeatureId = 'observabilityCases';
export const casesFeatureIdV2 = 'observabilityCasesV2';
export const casesFeatureIdV3 = 'observabilityCasesV3';
export const sloFeatureId = 'slo';
// The ID of the observability app. Should more appropriately be called
// 'observability' but it's used in telemetry by applicationUsage so we don't
// want to change it.
export const observabilityAppId = 'observability-overview';

// Used by feature and "solution" registration
export const observabilityFeatureId = 'observability';

// Name of a locator created by the uptime plugin. Intended for use
// by other plugins as well, so defined here to prevent cross-references.
export { uptimeOverviewLocatorID } from '@kbn/deeplinks-observability';
export const syntheticsMonitorDetailLocatorID = 'SYNTHETICS_MONITOR_DETAIL_LOCATOR';
export const syntheticsMonitorLocationQueryLocatorID =
  'SYNTHETICS_MONITOR_GROUP_BY_LOCATION_LOCATOR';
export const syntheticsEditMonitorLocatorID = 'SYNTHETICS_EDIT_MONITOR_LOCATOR';
export const syntheticsSettingsLocatorID = 'SYNTHETICS_SETTINGS';
export const alertsLocatorID = 'ALERTS_LOCATOR';
export const ruleDetailsLocatorID = 'RULE_DETAILS_LOCATOR';
export const rulesLocatorID = 'RULES_LOCATOR';
export const sloDetailsLocatorID = 'SLO_DETAILS_LOCATOR';
export const sloEditLocatorID = 'SLO_EDIT_LOCATOR';
export const sloListLocatorID = 'SLO_LIST_LOCATOR';

import { paths } from './locators/paths';
export const observabilityPaths = paths.observability;
export type { AlertsLocator, AlertsLocatorParams } from './locators/alerts';
export { AlertsLocatorDefinition } from './locators/alerts';
export { observabilityAlertFeatureIds } from './constants';

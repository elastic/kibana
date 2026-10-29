/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABILITY_APM_ENABLE_TRANSACTION_PROFILING_ID,
  OBSERVABILITY_PROFILING_AWS_COST_DISCOUNT_RATE_ID,
  OBSERVABILITY_PROFILING_AZURE_COST_DISCOUNT_RATE_ID,
  OBSERVABILITY_PROFILING_CO2_PER_KWH_ID,
  OBSERVABILITY_PROFILING_COST_PER_VCPU_PER_HOUR_ID,
  OBSERVABILITY_PROFILING_DATACENTER_PUE_ID,
  OBSERVABILITY_PROFILING_PER_VCPU_WATT_ARM64_ID,
  OBSERVABILITY_PROFILING_PER_VCPU_WATT_X86_ID,
  OBSERVABILITY_PROFILING_SHOW_ERROR_FRAMES_ID,
} from '@kbn/management-settings-ids';

export const enableInspectEsQueries = 'observability:enableInspectEsQueries';
export const maxSuggestions = 'observability:maxSuggestions';
export const enableComparisonByDefault = 'observability:enableComparisonByDefault';
export const defaultApmServiceEnvironment = 'observability:apmDefaultServiceEnvironment';
export const apmProgressiveLoading = 'observability:apmProgressiveLoading';
export const apmServiceGroupMaxNumberOfServices =
  'observability:apmServiceGroupMaxNumberOfServices';
export const apmMaxNumberOfServices = 'observability:apmMaxNumberOfServices';
export const enableInfrastructureAssetCustomDashboards =
  'observability:enableInfrastructureAssetCustomDashboards';
export const apmEnableTableSearchBar = 'observability:apmEnableTableSearchBar';
export const apmEnableServiceInventoryTableSearchBar =
  'observability:apmEnableServiceInventoryTableSearchBar';
export const apmTraceLogsDefaultColumns = 'observability:apmTraceLogsDefaultColumns';
export const apmAWSLambdaPriceFactor = 'observability:apmAWSLambdaPriceFactor';
export const apmAWSLambdaRequestCostPerMillion = 'observability:apmAWSLambdaRequestCostPerMillion';
export const syntheticsThrottlingEnabled = 'observability:syntheticsThrottlingEnabled';
export const enableLegacyUptimeApp = 'observability:enableLegacyUptimeApp';
export const profilingShowErrorFrames = OBSERVABILITY_PROFILING_SHOW_ERROR_FRAMES_ID;
export const profilingPervCPUWattX86 = OBSERVABILITY_PROFILING_PER_VCPU_WATT_X86_ID;
export const profilingPervCPUWattArm64 = OBSERVABILITY_PROFILING_PER_VCPU_WATT_ARM64_ID;
export const profilingCo2PerKWH = OBSERVABILITY_PROFILING_CO2_PER_KWH_ID;
export const profilingDatacenterPUE = OBSERVABILITY_PROFILING_DATACENTER_PUE_ID;
export const profilingAWSCostDiscountRate = OBSERVABILITY_PROFILING_AWS_COST_DISCOUNT_RATE_ID;
export const profilingCostPervCPUPerHour = OBSERVABILITY_PROFILING_COST_PER_VCPU_PER_HOUR_ID;
export const profilingAzureCostDiscountRate = OBSERVABILITY_PROFILING_AZURE_COST_DISCOUNT_RATE_ID;
export const apmEnableTransactionProfiling = OBSERVABILITY_APM_ENABLE_TRANSACTION_PROFILING_ID;
export const searchExcludedDataTiers = 'observability:searchExcludedDataTiers';
export const enableDiagnosticMode = 'observability:enableDiagnosticMode';

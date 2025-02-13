/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110905

import { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { lazy } from 'react';
import {
  Plugin,
  ObservabilityPublicPluginsStart,
  ObservabilityPublicPluginsSetup,
  ObservabilityPublicStart,
  ObservabilityPublicSetup,
} from './plugin';
export type {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
  ObservabilityPublicPluginsSetup,
  ObservabilityPublicPluginsStart,
};
export const plugin: PluginInitializer<
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
  ObservabilityPublicPluginsSetup,
  ObservabilityPublicPluginsStart
> = (initializerContext: PluginInitializerContext) => {
  return new Plugin(initializerContext);
};

export type { ConfigSchema } from './plugin';

export {
  enableLegacyUptimeApp,
  syntheticsThrottlingEnabled,
  enableInspectEsQueries,
  enableComparisonByDefault,
  apmServiceGroupMaxNumberOfServices,
  enableAgentExplorerView,
  apmEnableTableSearchBar,
} from '../common/ui_settings_keys';
export {
  alertsLocatorID,
  ruleDetailsLocatorID,
  rulesLocatorID,
  sloDetailsLocatorID,
  sloEditLocatorID,
  uptimeOverviewLocatorID,
} from '../common';

export type { RulesParams } from './locators/rules';
export { getCoreVitalsComponent } from './pages/overview/components/sections/ux/core_web_vitals/get_core_web_vitals_lazy';
export { ObservabilityAlertSearchBar } from './components/alert_search_bar/get_alert_search_bar_lazy';
export { DatePicker } from './pages/overview/components/date_picker';

export const LazyAlertsFlyout = lazy(() => import('./components/alerts_flyout/alerts_flyout'));

export type {
  Stat,
  Coordinates,
  Series,
  FetchDataParams,
  HasDataParams,
  HasDataResponse,
  UXHasDataResponse,
  SyntheticsHasDataResponse,
  APMHasDataResponse,
  InfraMetricsHasDataResponse,
  InfraLogsHasDataResponse,
  FetchData,
  HasData,
  ObservabilityFetchDataPlugins,
  DataHandler,
  FetchDataResponse,
  LogsFetchDataResponse,
  StringOrNull,
  NumberOrNull,
  MetricsFetchDataSeries,
  MetricsFetchDataResponse,
  UptimeFetchDataResponse,
  ApmFetchDataResponse,
  UxFetchDataResponse,
  UniversalProfilingDataResponse,
  ObservabilityFetchDataResponse,
  ObservabilityHasDataResponse,
  Subset,
} from './typings';
import { TopAlert } from './typings/alerts';
export type { TopAlert };
import type { AlertDetailsAppSectionProps } from './pages/alert_details/types';
export type { AlertDetailsAppSectionProps };

export { observabilityFeatureId, observabilityAppId } from '../common';

export { useFetchDataViews } from './hooks/use_fetch_data_views';
export { useTimeBuckets } from './hooks/use_time_buckets';
export { createUseRulesLink } from './hooks/create_use_rules_link';
export { useSummaryTimeRange } from './hooks/use_summary_time_range';

export { getApmTraceUrl } from './utils/get_apm_trace_url';
export { buildEsQuery } from './utils/build_es_query';

export type {
  ObservabilityRuleTypeFormatter,
  ObservabilityRuleTypeModel,
  ObservabilityRuleTypeRegistry,
} from './rules/create_observability_rule_type_registry';
export { createObservabilityRuleTypeRegistryMock } from './rules/observability_rule_type_registry_mock';

export { DatePickerContextProvider } from './context/date_picker_context/date_picker_context';

export { fromQuery, toQuery } from './utils/url';
export { getAlertSummaryTimeRange } from './utils/alert_summary_widget';
export { calculateTimeRangeBucketSize } from './pages/overview/helpers/calculate_bucket_size';
export type { render } from './utils/test_helper';

export { convertTo } from '../common/utils/formatters/duration';
export { formatAlertEvaluationValue } from './utils/format_alert_evaluation_value';
export {
  RuleFlyoutKueryBar,
  AutocompleteField,
  WithKueryAutocompletion,
} from './components/rule_kql_filter';
export { useAnnotations } from './components/annotations/use_annotations';
export { RuleConditionChart } from './components/rule_condition_chart';
export { getGroupFilters } from '../common/custom_threshold_rule/helpers/get_group';
export type { GenericAggType } from './components/rule_condition_chart/rule_condition_chart';
export { Threshold } from './components/custom_threshold/components/threshold';

export { ObservabilityAlertsTable } from './components/alerts_table/alerts_table_lazy';
export { AlertActions } from './components/alert_actions/alert_actions_lazy';
export type {
  GetObservabilityAlertsTableProp,
  ObservabilityAlertsTableContext,
  ObservabilityAlertsTableProps,
} from './components/alerts_table/types';

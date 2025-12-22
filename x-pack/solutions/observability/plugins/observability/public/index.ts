/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110905

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import type {
  ObservabilityPublicPluginsStart,
  ObservabilityPublicPluginsSetup,
  ObservabilityPublicStart,
  ObservabilityPublicSetup,
} from './plugin';
import { Plugin } from './plugin';
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
  apmEnableTableSearchBar,
} from '../common/ui_settings_keys';
export { alertsLocatorID, uptimeOverviewLocatorID } from '../common';
export {
  ruleDetailsLocatorID,
  rulesLocatorID,
  sloDetailsLocatorID,
  sloEditLocatorID,
} from '@kbn/deeplinks-observability';

export type { RulesLocatorParams } from '@kbn/deeplinks-observability';

export { ObservabilityAlertSearchBar } from './components/alert_search_bar/get_alert_search_bar_lazy';

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
import type { TopAlert } from './typings/alerts';
export type { TopAlert };
import type { AlertDetailsAppSectionProps } from './pages/alert_details/types';
export type { AlertDetailsAppSectionProps };

export { observabilityFeatureId, observabilityAppId } from '../common';

export { useFetchDataViews } from './hooks/use_fetch_data_views';
export { useTimeBuckets } from './hooks/use_time_buckets';
export { createUseRulesLink } from './hooks/create_use_rules_link';
export { useSummaryTimeRange } from './hooks/use_summary_time_range';

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

export {
  ObservabilityAlertsTableLazy,
  ObservabilityAlertsTable,
  AlertsTableCellValue,
  getAlertFieldValue,
  CellTooltip,
  TimestampTooltip,
  getColumns,
  getGroupStats,
  getAggregationsByGroupingField,
  renderGroupPanel,
  GroupingToolbarControls,
  DEFAULT_GROUPING_OPTIONS,
  ungrouped,
  ruleName,
  source,
  AlertSeverityBadge,
  AlertStatusIndicator,
  Tags,
  AlertActions,
  useCaseActions,
} from './components/alerts_table';
export type {
  ObservabilityAlertsTableContext,
  ObservabilityAlertsTableProps,
  GetObservabilityAlertsTableProp,
  BucketItem,
  AlertsByGroupingAgg,
  ObservabilityRuleTypeRegistry as AlertsTableObservabilityRuleTypeRegistry,
  ConfigSchema as AlertsTableConfigSchema,
  TopAlert as AlertsTableTopAlert,
} from './components/alerts_table';

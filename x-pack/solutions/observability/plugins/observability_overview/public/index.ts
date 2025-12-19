/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110905

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import type {
  ObservabilityOverviewPublicPluginsStart,
  ObservabilityOverviewPublicPluginsSetup,
  ObservabilityOverviewPublicStart,
  ObservabilityOverviewPublicSetup,
} from './plugin';
import { Plugin } from './plugin';
export type {
  ObservabilityOverviewPublicSetup,
  ObservabilityOverviewPublicStart,
  ObservabilityOverviewPublicPluginsSetup,
  ObservabilityOverviewPublicPluginsStart,
};
export const plugin: PluginInitializer<
  ObservabilityOverviewPublicSetup,
  ObservabilityOverviewPublicStart,
  ObservabilityOverviewPublicPluginsSetup,
  ObservabilityOverviewPublicPluginsStart
> = (initializerContext: PluginInitializerContext) => {
  return new Plugin(initializerContext);
};

export { getCoreVitalsComponent } from './pages/overview/components/sections/ux/core_web_vitals/get_core_web_vitals_lazy';
export { DatePicker } from './pages/overview/components/date_picker';

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
} from './typings/fetch_overview_data';

export { useTimeBuckets } from './hooks/use_time_buckets';

export { DatePickerContextProvider } from './context/date_picker_context/date_picker_context';

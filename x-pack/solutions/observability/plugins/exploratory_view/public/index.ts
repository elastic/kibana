/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import {
  Plugin,
  ExploratoryViewPublicPluginsStart,
  ExploratoryViewPublicPluginsSetup,
  ExploratoryViewPublicStart,
  ExploratoryViewPublicSetup,
} from './plugin';
export type {
  ExploratoryViewPublicSetup,
  ExploratoryViewPublicStart,
  ExploratoryViewPublicPluginsSetup,
  ExploratoryViewPublicPluginsStart,
};
export const plugin: PluginInitializer<
  ExploratoryViewPublicSetup,
  ExploratoryViewPublicStart,
  ExploratoryViewPublicPluginsSetup,
  ExploratoryViewPublicPluginsStart
> = (initializerContext: PluginInitializerContext) => {
  return new Plugin(initializerContext);
};

export { ALL_VALUES_SELECTED } from './components/shared/exploratory_view/configurations/constants/url_constants';

export { APP_ROUTE as EXPLORATORY_VIEW_APP_URL } from './constants';

export { ExploratoryView, FilterValueLabel, SelectableUrlList } from './components/shared';

export { createExploratoryViewUrl } from './components/shared/exploratory_view/configurations/exploratory_view_url';
export type { AllSeries } from './components/shared/exploratory_view/hooks/use_series_storage';
export type { SeriesUrl, UrlFilter } from './components/shared/exploratory_view/types';
export type { ExploratoryEmbeddableProps } from './components/shared/exploratory_view/embeddable/embeddable';

export type { SeriesConfig, ConfigProps } from './components/shared/exploratory_view/types';
export {
  ReportTypes,
  FILTER_RECORDS,
  ENVIRONMENT_ALL,
  REPORT_METRIC_FIELD,
  USE_BREAK_DOWN_COLUMN,
  RECORDS_FIELD,
  OPERATION_COLUMN,
  TERMS_COLUMN,
  RECORDS_PERCENTAGE_FIELD,
} from './components/shared/exploratory_view/configurations/constants';
export { fromQuery, toQuery } from './utils/url';

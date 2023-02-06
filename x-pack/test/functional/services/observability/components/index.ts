/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityAlertSearchBarProvider } from './alert_search_bar';
import { ObservabilityAlertSummaryWidgetProvider } from './alert_summary_widget';

import { FtrProviderContext } from '../../../ftr_provider_context';

export function ObservabilityComponentsProvider(context: FtrProviderContext) {
  const alertSearchBar = ObservabilityAlertSearchBarProvider(context);
  const alertSummaryWidget = ObservabilityAlertSummaryWidgetProvider(context);

  return {
    alertSearchBar,
    alertSummaryWidget,
  };
}

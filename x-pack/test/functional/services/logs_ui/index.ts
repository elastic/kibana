/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { LogEntryCategoriesPageProvider } from './log_entry_categories';
import { LogEntryRatePageProvider } from './log_entry_rate';
import { LogStreamPageProvider } from './log_stream';

export function LogsUiProvider(context: FtrProviderContext) {
  return {
    logEntryCategoriesPage: LogEntryCategoriesPageProvider(context),
    logEntryRatePage: LogEntryRatePageProvider(context),
    logStreamPage: LogStreamPageProvider(context),
  };
}

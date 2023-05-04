/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityAlertsPaginationProvider } from './pagination';
import { ObservabilityAlertsCommonProvider } from './common';
import { ObservabilityAlertsAddToCaseProvider } from './add_to_case';
import { ObservabilityAlertsRulesProvider } from './rules_page';

import { FtrProviderContext } from '../../../ftr_provider_context';

export function ObservabilityAlertsProvider(context: FtrProviderContext) {
  const common = ObservabilityAlertsCommonProvider(context);
  const pagination = ObservabilityAlertsPaginationProvider(context);
  const addToCase = ObservabilityAlertsAddToCaseProvider(context);
  const rulesPage = ObservabilityAlertsRulesProvider(context);

  return {
    common,
    pagination,
    addToCase,
    rulesPage,
  };
}

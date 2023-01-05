/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityOverviewCommonProvider } from './common';

import { FtrProviderContext } from '../../../ftr_provider_context';

export function ObservabilityOverviewProvider(context: FtrProviderContext) {
  const common = ObservabilityOverviewCommonProvider(context);

  return {
    common,
  };
}

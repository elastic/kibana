/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

import { UptimeMonitorProvider } from './monitor';
import { UptimeNavigationProvider } from './navigation';
import { UptimeOverviewProvider } from './overview';

export function UptimeProvider(context: FtrProviderContext) {
  const monitor = UptimeMonitorProvider(context);
  const navigation = UptimeNavigationProvider(context);
  const overview = UptimeOverviewProvider(context);

  return {
    monitor,
    navigation,
    overview,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { ObservabilityUsersProvider } from './users';
import { ObservabilityAlertsProvider } from './alerts';
import { ObservabilityOverviewProvider } from './overview';
import { ObservabilityComponentsProvider } from './components';

export function ObservabilityProvider(context: FtrProviderContext) {
  const alerts = ObservabilityAlertsProvider(context);
  const components = ObservabilityComponentsProvider(context);
  const users = ObservabilityUsersProvider(context);
  const overview = ObservabilityOverviewProvider(context);

  return {
    alerts,
    components,
    users,
    overview,
  };
}

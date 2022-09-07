/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { ObservabilityUsersProvider } from './users';
import { ObservabilityAlertsProvider } from './alerts';

export function ObservabilityProvider(context: FtrProviderContext) {
  const alerts = ObservabilityAlertsProvider(context);
  const users = ObservabilityUsersProvider(context);

  return {
    alerts,
    users,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Subscription } from 'rxjs';
import type { Services } from '../common/services';

export const enableManagementCardsLanding = (services: Services): Subscription => {
  const { management } = services;

  return services.serverless
    .getNavigationCards$(services.security.authz.isRoleManagementEnabled())
    .subscribe((extendCardNavDefinitions) => {
      management.setupCardsNavigation({
        enabled: true,
        extendCardNavDefinitions,
      });
    });
};

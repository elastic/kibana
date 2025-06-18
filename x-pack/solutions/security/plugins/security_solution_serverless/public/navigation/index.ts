/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_PATH } from '@kbn/security-solution-plugin/common';
import type { SecurityProductTypes } from '../../common/config';
import type { Services } from '../common/services';
import { subscribeBreadcrumbs } from './breadcrumbs';
import { registerSolutionNavigation } from './navigation';
import { enableManagementCardsLanding } from './management_cards';

export const startNavigation = (services: Services, productTypes: SecurityProductTypes) => {
  services.serverless.setProjectHome(APP_PATH);

  registerSolutionNavigation(services, productTypes);
  enableManagementCardsLanding(services);
  subscribeBreadcrumbs(services);
};

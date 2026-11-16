/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationsRouteRepository } from './applications/route';
import { errorsRouteRepository } from './errors/route';
import { networkRouteRepository } from './network/route';
import { overviewRouteRepository } from './overview/route';
import { sessionsRouteRepository } from './sessions/route';
import { usageRouteRepository } from './usage/route';

export const getGlobalDigitalExperienceServerRouteRepository = () => ({
  ...applicationsRouteRepository,
  ...overviewRouteRepository,
  ...usageRouteRepository,
  ...errorsRouteRepository,
  ...networkRouteRepository,
  ...sessionsRouteRepository,
});

export type DigitalExperienceServerRouteRepository = ReturnType<
  typeof getGlobalDigitalExperienceServerRouteRepository
>;

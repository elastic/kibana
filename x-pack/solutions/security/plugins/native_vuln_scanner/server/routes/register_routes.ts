/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerKnowledgeRoute } from './knowledge';
import { registerOnboardingPlanRoute } from './onboarding_plan';
import { registerOnboardingRuntimePinRoute } from './onboarding_runtime_pin';
import { registerOnboardingScheduleRoute } from './onboarding_schedule';
import { registerOnboardingStatusRoute } from './onboarding_status';
import { registerScanRoute } from './scan';
import type { RouteDependencies } from './types';

export type { RouteDependencies, RouteServices } from './types';

export const registerRoutes = (dependencies: RouteDependencies) => {
  registerOnboardingStatusRoute(dependencies);
  registerOnboardingPlanRoute(dependencies);
  registerOnboardingRuntimePinRoute(dependencies);
  registerOnboardingScheduleRoute(dependencies);
  registerScanRoute(dependencies);
  registerKnowledgeRoute(dependencies);
};

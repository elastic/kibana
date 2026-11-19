/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsStage, ResolvedJourney } from '../../types';

export type OnboardingStepId = 'connect' | 'explore' | 'dashboard' | 'search' | 'build';

/** Every journey is three steps long, so the count is known before the data says which one it is. */
export const ONBOARDING_STEP_COUNT = 3;

/** Adding data comes first in every journey; what follows depends on the kind of data. */
export const JOURNEY_ONBOARDING_STEPS: Readonly<
  Record<ResolvedJourney, readonly OnboardingStepId[]>
> = {
  analytics: ['connect', 'explore', 'dashboard'],
  search: ['connect', 'search', 'build'],
};

/** The only step an empty deployment can be on. */
export const GATE_ONBOARDING_STEPS: readonly OnboardingStepId[] = ['connect'];

const ANALYTICS_STAGE_STEP: Readonly<Record<AnalyticsStage, OnboardingStepId>> = {
  noData: 'connect',
  hasData: 'explore',
  hasDashboards: 'dashboard',
};

/** The step a deployment has reached on its journey. */
export const getReachedOnboardingStep = (
  journey: ResolvedJourney,
  stage: AnalyticsStage
): OnboardingStepId => {
  if (stage === 'noData') {
    return 'connect';
  }
  return journey === 'analytics' ? ANALYTICS_STAGE_STEP[stage] : 'search';
};

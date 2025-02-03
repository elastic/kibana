/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/core/public';

export enum OnboardingHubEventTypes {
  OnboardingHubStepOpen = 'Onboarding Hub Step Open',
  OnboardingHubStepFinished = 'Onboarding Hub Step Finished',
  OnboardingHubStepLinkClicked = 'Onboarding Hub Step Link Clicked',
}

type OnboardingHubStepOpenTrigger = 'navigation' | 'click';

interface OnboardingHubStepOpenParams {
  stepId: string;
  trigger: OnboardingHubStepOpenTrigger;
}

export interface OnboardingHubStepLinkClickedParams {
  originStepId: string;
  stepLinkId: string;
}

export type OnboardingHubStepFinishedTrigger = 'auto_check' | 'click';

export interface OnboardingHubStepFinishedParams {
  stepId: string;
  stepLinkId?: string;
  trigger: OnboardingHubStepFinishedTrigger;
}

export interface OnboardingHubTelemetryEventsMap {
  [OnboardingHubEventTypes.OnboardingHubStepOpen]: OnboardingHubStepOpenParams;
  [OnboardingHubEventTypes.OnboardingHubStepFinished]: OnboardingHubStepFinishedParams;
  [OnboardingHubEventTypes.OnboardingHubStepLinkClicked]: OnboardingHubStepLinkClickedParams;
}

export interface OnboardingHubTelemetryEvent {
  eventType: OnboardingHubEventTypes;
  schema: RootSchema<OnboardingHubTelemetryEventsMap[OnboardingHubEventTypes]>;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

export enum TrialCompanionEventTypes {
  ViewButtonClicked = 'TC View Button Clicked',
  DismissButtonClicked = 'TC Dismiss Button Clicked',
}

interface TrialCompanionViewButtonClickedParams {
  app: string;
}

export interface TrialCompanionTelemetryEventsMap {
  [TrialCompanionEventTypes.ViewButtonClicked]: TrialCompanionViewButtonClickedParams;
  [TrialCompanionEventTypes.DismissButtonClicked]: {};
}

export interface TrialCompanionTelemetryEvent {
  eventType: TrialCompanionEventTypes;
  schema: RootSchema<TrialCompanionTelemetryEventsMap[TrialCompanionEventTypes]>;
}

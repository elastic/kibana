/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TrialCompanionEventTypes } from './types';
import type { TrialCompanionTelemetryEvent } from './types';

export const TrialCompanionViewButtonClickedEvent: TrialCompanionTelemetryEvent = {
  eventType: TrialCompanionEventTypes.ViewButtonClicked,
  schema: {
    app: {
      type: 'keyword',
      _meta: {
        description: 'App name',
        optional: false,
      },
    },
  },
};

export const TrialCompanionDismissButtonClickedEvent: TrialCompanionTelemetryEvent = {
  eventType: TrialCompanionEventTypes.DismissButtonClicked,
  schema: {},
};

export const trialCompanionTelemetryEvents = [
  TrialCompanionViewButtonClickedEvent,
  TrialCompanionDismissButtonClickedEvent,
];

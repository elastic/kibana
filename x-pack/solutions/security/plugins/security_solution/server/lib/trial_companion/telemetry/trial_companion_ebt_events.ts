/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EventTypeOpts } from '@kbn/core/server';

export const TRIAL_COMPANION_DEPLOYMENT_STATE: EventTypeOpts<{ openTODOs: number[] }> = {
  eventType: 'trial_companion_deployment_milestone',
  schema: {
    openTODOs: {
      type: 'array',
      items: {
        type: 'long',
        _meta: { description: 'Milestone IDs' },
      },
      _meta: {
        description: 'Trial Companion deployment open TODOs aka NBAs',
      },
    },
  },
};

export const TRIAL_COMPANION_MILESTONE_REFRESH_ERROR: EventTypeOpts<{ message: string }> = {
  eventType: 'trial_companion_milestone_refresh_error',
  schema: {
    message: {
      type: 'keyword',
      _meta: {
        description: 'Error message during milestone refresh',
      },
    },
  },
};

export const TRIAL_COMPANION_EVENTS = [
  TRIAL_COMPANION_DEPLOYMENT_STATE,
  TRIAL_COMPANION_MILESTONE_REFRESH_ERROR,
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connectors } from './connector';

export type CreateRulePropsRewrites<CreateRuleProps> = Partial<Exclude<CreateRuleProps, 'type'>>;

export interface Actions {
  connectors: Connectors[];
}

export interface AlertsFilter {
  query: {
    kql: string;
  };
  timeframe: {
    days: number[];
    timezone: string;
    hours: {
      start: string;
      end: string;
    };
  };
}

export interface SecurityEvent {
  [field: string]: unknown;
  '@timestamp': number;
  ecs: {
    version: string;
  };
  event: {
    kind: 'event';
    category: string;
    type: string;
  };
}

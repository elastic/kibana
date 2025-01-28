/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './all';
export * from './details';
export * from './last_event_time';
export * from './eql';

export const EntityType = {
  EVENTS: 'events',
  SESSIONS: 'sessions',
} as const;
export type EntityType = (typeof EntityType)[keyof typeof EntityType];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Prototype swim lane window: last 24 hours. */
export const BEHAVIORAL_ANOMALIES_TIME_RANGE = { from: 'now-24h', to: 'now' } as const;

/** One bucket per hour across the 24-hour window (matches design mock). */
export const BEHAVIORAL_ANOMALIES_BUCKET_INTERVAL_HOURS = 1;

export const BEHAVIORAL_ANOMALIES_BUCKET_COUNT = 24;

/** Shared entity id for all flyouts in this UI prototype. */
export const BEHAVIORAL_ANOMALIES_PROTOTYPE_ENTITY_ID = 'prototype-behavioral-anomalies';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Frozen clock every scenario authors its documents against, so they stay
 * byte-stable. Seeding shifts them forward to the current time.
 */
export const FP_TP_BASE_TIME = new Date('2026-07-13T12:00:00.000Z');

/**
 * Default run marker. The manual seed script uses it as-is, so one world at a
 * time lives under these ids; the eval derives a fresh marker per run from it.
 */
export const FP_TP_TWIN_SEED_LABEL = 'ad-fp-tp-twins-2026-09';

export const FP_TP_ENTITY_INDEX = '.entities.v2.latest.default';

/** Alias the workflow reads entities through. */
export const FP_TP_ENTITY_READ_ALIAS = 'entities-latest-default';

export const FP_TP_ATTACK_ADHOC_INDEX = '.adhoc.alerts-security.attack.discovery.alerts-default';

/** Half-width of the raw-event window the analysis reads around the attack timestamp. */
export const FP_TP_RAW_EVENT_WINDOW_MS = 2 * 60 * 60 * 1000;

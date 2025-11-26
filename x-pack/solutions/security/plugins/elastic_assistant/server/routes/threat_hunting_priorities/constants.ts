/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Threat hunting priorities public API
export const THREAT_HUNTING_PRIORITIES = '/api/threat_hunting_priorities';
export const THREAT_HUNTING_PRIORITIES_GENERATE = `${THREAT_HUNTING_PRIORITIES}/_generate` as const;


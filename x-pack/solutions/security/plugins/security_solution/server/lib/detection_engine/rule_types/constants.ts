/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TIMESTAMP_RUNTIME_FIELD = 'kibana.combined_timestamp' as const;

/**
 * When suppression is enabled, allow to to suppress more than max signals alerts
 */
export const MAX_SIGNALS_SUPPRESSION_MULTIPLIER = 5;

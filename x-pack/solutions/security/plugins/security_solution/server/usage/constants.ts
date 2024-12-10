/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * We limit the max results window to prevent in-memory from blowing up when we do correlation.
 * This is limiting us to 10,000 cases and 10,000 elastic detection rules to do telemetry and correlation
 * and the choice was based on the initial "index.max_result_window" before this turned into a PIT (Point In Time)
 * implementation.
 *
 * This number could be changed, and the implementation details of how we correlate could change as well (maybe)
 * to avoid pulling 10,000 worth of cases and elastic rules into memory.
 *
 * However, for now, we are keeping this maximum as the original and the in-memory implementation
 */
export const MAX_RESULTS_WINDOW = 10_000;

/**
 * We choose our max per page based on 1k as that
 * appears to be what others are choosing here in the other sections of telemetry:
 * https://github.com/elastic/kibana/pull/99031
 */
export const MAX_PER_PAGE = 1_000;

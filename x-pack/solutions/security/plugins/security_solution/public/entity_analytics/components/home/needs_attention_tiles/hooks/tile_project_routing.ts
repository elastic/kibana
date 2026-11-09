/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Runs every tile query in the local (origin) project. With cross-project search the space default
 * is often `_alias:*`, but the tiles join the local entity store, so alerts, anomalies and risk
 * scores from linked projects must not be counted.
 */
export const TILE_PROJECT_ROUTING = '_alias:_origin' as const;

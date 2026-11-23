/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Body of `POST /internal/nightshift/detection/_tick`. */
export interface DetectionEngineTickBody {
  /**
   * Start every due strategy at its latest settled cadence boundary instead of replaying what
   * it missed, and report the skipped minutes.
   */
  skip_backlog: boolean;
}

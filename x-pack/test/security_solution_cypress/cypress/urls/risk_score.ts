/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RISK_SCORE_URL = `/internal/risk_score` as const;
export const INDICES_URL = `/internal/risk_score/indices` as const;
export const INGEST_PIPELINES_URL = `/api/ingest_pipelines` as const;
export const TRANSFORMS_URL = `/internal/transform` as const;
export const STORED_SCRIPTS_URL = `/internal/risk_score/stored_scripts` as const;
export const RISK_SCORE_SAVED_OBJECTS_URL =
  `/internal/risk_score/prebuilt_content/saved_objects` as const;
export const SAVED_OBJECTS_URL = `/api/saved_objects` as const;

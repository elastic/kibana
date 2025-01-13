/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Internal Risk Score routes
 */
export const INTERNAL_RISK_SCORE_URL = '/internal/risk_score' as const;
export const PUBLIC_RISK_SCORE_URL = '/api/risk_score' as const;
export const RISK_SCORE_PREVIEW_URL = `${INTERNAL_RISK_SCORE_URL}/preview` as const;
export const RISK_SCORE_ENTITY_CALCULATION_URL =
  `${INTERNAL_RISK_SCORE_URL}/calculation/entity` as const;

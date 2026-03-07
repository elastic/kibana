/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsEmbeddableState } from '../../../../server/lib/embeddables/alerts_schema';

/**
 * Transforms SLO Alerts embeddable state for serialization.
 * Pass-through for now; add legacy state migration here if needed.
 */
export function transformAlertsOut(
  storedState: AlertsEmbeddableState
): AlertsEmbeddableState {
  return storedState;
}

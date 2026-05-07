/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsRagCategory, AlertsRagExample } from '../dataset';
import { alertsRagDataset } from './alerts_rag_dataset';

export { alertsRagDataset };
export type {
  AlertsRagCategory,
  AlertsRagExample,
  AlertDocument,
  AlertDocumentSource,
} from '../dataset';

/**
 * Returns only examples belonging to the given category (or categories).
 *
 * Usage:
 *   filterByCategory('multi_alert_correlation')
 *   filterByCategory(['field_specific_lookup', 'temporal_query'])
 */
export const filterByCategory = (
  category: AlertsRagCategory | AlertsRagCategory[]
): AlertsRagExample[] => {
  const categories = Array.isArray(category) ? category : [category];
  return alertsRagDataset.filter((ex) => categories.includes(ex.metadata.category));
};

/**
 * Returns every distinct category present in the dataset.
 * Useful for dynamically iterating over all represented categories in tests.
 */
export const getDatasetCategories = (): AlertsRagCategory[] => {
  const seen = new Set<AlertsRagCategory>();
  for (const ex of alertsRagDataset) {
    seen.add(ex.metadata.category);
  }
  return Array.from(seen);
};

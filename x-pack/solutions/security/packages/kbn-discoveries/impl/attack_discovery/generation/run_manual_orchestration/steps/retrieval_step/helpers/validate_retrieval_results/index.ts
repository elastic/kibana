/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertRetrievalResult } from '../../../../../invoke_alert_retrieval_workflow';
import type { CustomWorkflowAlertResult } from '../../../../../extract_custom_workflow_result';

/**
 * Validates that at least one source produced alert retrieval results.
 * Throws if both legacy and custom retrieval returned empty results.
 */
export const validateRetrievalResults = ({
  customResults,
  legacyResult,
}: {
  customResults: CustomWorkflowAlertResult[];
  legacyResult: AlertRetrievalResult | null;
}): void => {
  if (legacyResult == null && customResults.length === 0) {
    throw new Error(
      'No alert retrieval results: default retrieval is disabled or failed, and no custom workflows succeeded'
    );
  }
};

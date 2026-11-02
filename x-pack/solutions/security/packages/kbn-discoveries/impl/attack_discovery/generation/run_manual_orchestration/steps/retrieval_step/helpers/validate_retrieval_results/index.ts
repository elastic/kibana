/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ERROR_CATEGORIES } from '@kbn/discoveries-schemas';

import type { AlertRetrievalResult } from '../../../../../invoke_alert_retrieval_workflow';
import type { CustomWorkflowAlertResult } from '../../../../../extract_custom_workflow_result';
import { AttackDiscoveryError } from '../../../../../../../lib/errors/attack_discovery_error';

/**
 * Validates that at least one source can produce alerts for generation.
 *
 * The deterministic retrieval phase (default retrieval + custom workflows) is
 * only one of the three retrieval toggles. When the Skill toggle
 * (`skill_enabled`) is on, the always-on ground-truthing gate that runs
 * immediately after this phase is allowed to retrieve net-new alerts of its
 * own, so an empty deterministic candidate set is acceptable and must NOT fail
 * the run here (the gate, or the downstream zero-alert guard, takes over).
 *
 * Throws only when the skill is also disabled and both legacy and custom
 * retrieval returned empty results — i.e. there is no possible source of alerts
 * (e.g. the user enabled only the alert retrieval workflows toggle but selected
 * no workflows). This is a misconfiguration that can only be detected at run
 * time, so it is thrown as a classified {@link AttackDiscoveryError}
 * (`validation_error`) rather than a generic `Error`. The classification is what
 * lets the failure surface as a proper, troubleshootable error state in the UI.
 */
export const validateRetrievalResults = ({
  customResults,
  legacyResult,
  skillEnabled,
}: {
  customResults: CustomWorkflowAlertResult[];
  legacyResult: AlertRetrievalResult | null;
  skillEnabled: boolean;
}): void => {
  if (!skillEnabled && legacyResult == null && customResults.length === 0) {
    throw new AttackDiscoveryError({
      errorCategory: ERROR_CATEGORIES.validation_error,
      message:
        'No alert retrieval results: default retrieval is disabled or failed, and no custom workflows succeeded',
    });
  }
};

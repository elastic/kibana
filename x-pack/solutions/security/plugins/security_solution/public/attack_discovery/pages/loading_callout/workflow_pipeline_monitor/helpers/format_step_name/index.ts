/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../../translations';

/** Maps known generation workflow step IDs to display names matching the Attack Discovery settings flyout */
export const STEP_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  generate_discoveries: i18n.GENERATION,
  promote_discoveries: i18n.VALIDATION, // backward compat
  retrieve_alerts: i18n.ALERT_RETRIEVAL,
  validate_discoveries: i18n.VALIDATION,
};

/** Formats a step ID for display, using the known mapping or falling back to title case */
export const formatStepName = (stepId: string): string => {
  return (
    STEP_DISPLAY_NAMES[stepId] ?? stepId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';

/**
 * Returns canonical ILM phase values for filtering (matches `getIlmPhase` output).
 * Uses option `value`, not localized `label`, so non-English locales keep working.
 */
export const ilmPhasesFromSelectedOptions = (
  selectedIlmPhaseOptions: EuiComboBoxOptionOption[]
): string[] =>
  selectedIlmPhaseOptions
    .map(({ value }) => value)
    .filter((v): v is string => typeof v === 'string');

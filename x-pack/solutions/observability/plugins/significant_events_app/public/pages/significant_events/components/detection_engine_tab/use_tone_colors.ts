/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import type { StepTone } from './labels';

/** Theme colours per step owner, so the page reads the same in light and dark mode. */
export function useToneColors(): Record<StepTone, { background: string; border: string }> {
  const { euiTheme } = useEuiTheme();
  const { colors } = euiTheme;
  return {
    customer: { background: colors.backgroundLightPrimary, border: colors.borderBasePrimary },
    code: { background: colors.backgroundLightSuccess, border: colors.borderBaseSuccess },
    ai: { background: colors.backgroundLightWarning, border: colors.borderBaseWarning },
    event: { background: colors.backgroundLightDanger, border: colors.borderBaseDanger },
    neutral: { background: colors.backgroundBaseSubdued, border: colors.borderBaseSubdued },
  };
}

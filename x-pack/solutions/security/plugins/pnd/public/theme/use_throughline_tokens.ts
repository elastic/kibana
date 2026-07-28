/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { useMemo } from 'react';
import type { DecisionState, ThreadType } from './throughline_tokens';
import { decisionStateColor, decisionStateLabel, threadTypeColor } from './throughline_tokens';

/**
 * Throughline design tokens bound to the active EUI theme. Prefer this hook over
 * reaching into raw hex — it keeps the prototype's semantics while rendering with
 * theme-aware colors (light/dark/borealis) instead of a CSS fork.
 */
export const useThroughlineTokens = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => ({
      euiTheme,
      threadTypeColor: (type: ThreadType) => threadTypeColor(euiTheme, type),
      decisionStateColor: (state: DecisionState) => decisionStateColor(euiTheme, state),
      decisionStateLabel,
    }),
    [euiTheme]
  );
};

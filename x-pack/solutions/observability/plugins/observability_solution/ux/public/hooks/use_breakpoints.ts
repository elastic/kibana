/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsWithinMaxBreakpoint, useIsWithinMinBreakpoint } from '@elastic/eui';

export type Breakpoints = Record<string, boolean>;

export function useBreakpoints() {
  const screenSizes = {
    isXSmall: useIsWithinMaxBreakpoint('xs'),
    isSmall: useIsWithinMaxBreakpoint('s'),
    isMedium: useIsWithinMaxBreakpoint('m'),
    isLarge: useIsWithinMaxBreakpoint('l'),
    isXl: useIsWithinMaxBreakpoint('xl'),
    isXXL: useIsWithinMaxBreakpoint('xxl'),
    isXXXL: useIsWithinMinBreakpoint('xxxl'),
  };

  return screenSizes;
}

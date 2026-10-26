/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Capabilities } from '@kbn/core-capabilities-common';
import { CASES_FEATURE_ID, SECURITY_FEATURE_ID } from './constants';
import { hasAccessToSecuritySolution, isSecuritySolutionAccessible } from './helpers_access';

const baseCapabilities: Capabilities = {
  navLinks: {},
  management: {},
  catalogue: {},
};

describe('access helpers', () => {
  describe('hasAccessToSecuritySolution', () => {
    it('should return true for users with correct capabilities', () => {
      expect(
        hasAccessToSecuritySolution({
          ...baseCapabilities,
          [SECURITY_FEATURE_ID]: { show: true },
        })
      ).toBe(true);
    });

    it('should return false for users with incorrect capabilities', () => {
      expect(
        hasAccessToSecuritySolution({
          ...baseCapabilities,
          [SECURITY_FEATURE_ID]: { show: false },
        })
      ).toBe(false);

      expect(
        hasAccessToSecuritySolution({
          ...baseCapabilities,
          [SECURITY_FEATURE_ID]: {},
        })
      ).toBe(false);

      expect(hasAccessToSecuritySolution(baseCapabilities)).toBe(false);
    });
  });

  describe('isSecuritySolutionAccessible', () => {
    it('returns false for a dashboard-only capability set', () => {
      expect(
        isSecuritySolutionAccessible({
          ...baseCapabilities,
          navLinks: { securitySolutionUI: true, dashboards: true },
          dashboard_v2: { show: true },
        })
      ).toBe(false);
    });

    it('returns true when Security show is granted', () => {
      expect(
        isSecuritySolutionAccessible({
          ...baseCapabilities,
          [SECURITY_FEATURE_ID]: { show: true },
        })
      ).toBe(true);
    });

    it('returns true when Cases read is granted', () => {
      expect(
        isSecuritySolutionAccessible({
          ...baseCapabilities,
          [CASES_FEATURE_ID]: { read_cases: true },
        })
      ).toBe(true);
    });
  });
});

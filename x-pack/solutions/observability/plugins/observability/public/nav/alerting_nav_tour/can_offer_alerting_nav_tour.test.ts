/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { canOfferAlertingNavTour } from './can_offer_alerting_nav_tour';

jest.mock('@kbn/alerting-v2-utils', () => ({
  isAlertingV2Enabled: jest.fn(),
}));

const { isAlertingV2Enabled } = jest.requireMock('@kbn/alerting-v2-utils') as {
  isAlertingV2Enabled: jest.Mock;
};

const buildCore = ({
  toursEnabled = true,
  solutionNavId = 'oblt' as string | null,
}: {
  toursEnabled?: boolean;
  solutionNavId?: string | null;
} = {}): CoreStart =>
  ({
    notifications: { tours: { isEnabled: () => toursEnabled } },
    chrome: { getActiveSolutionNavId: () => solutionNavId },
  } as unknown as CoreStart);

describe('canOfferAlertingNavTour', () => {
  beforeEach(() => {
    isAlertingV2Enabled.mockReturnValue(true);
  });

  it('returns true when tours, project nav, and Alerting v2 are available', () => {
    expect(canOfferAlertingNavTour(buildCore())).toBe(true);
  });

  it('returns false when tours are disabled', () => {
    expect(canOfferAlertingNavTour(buildCore({ toursEnabled: false }))).toBe(false);
  });

  it('returns false on Classic navigation (no solution nav id)', () => {
    expect(canOfferAlertingNavTour(buildCore({ solutionNavId: null }))).toBe(false);
  });

  it('returns false when Alerting v2 is disabled', () => {
    isAlertingV2Enabled.mockReturnValue(false);
    expect(canOfferAlertingNavTour(buildCore())).toBe(false);
  });
});

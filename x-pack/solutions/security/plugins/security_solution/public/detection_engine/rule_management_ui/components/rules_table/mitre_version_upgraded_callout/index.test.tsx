/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { TestProviders } from '../../../../../common/mock';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../../../../../../common/constants';
import { MITRE_ATTACK_VERSION } from '../../../../../../common/detection_engine/mitre/mitre_version';
import { MitreVersionUpgradedCallout } from '.';

// The callout is gated behind the mitreAttackUpdatesUIEnabled feature flag,
// which is off by default. Force it on for this test suite.
jest.mock('../../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));

const mockUseMitreConfiguration = jest.fn();
jest.mock('../../../../../common/hooks/mitre/use_mitre_configuration', () => ({
  useMitreConfiguration: (...args: unknown[]) => mockUseMitreConfiguration(...args),
}));

const DISMISSAL_STORAGE_KEY = NEW_FEATURES_TOUR_STORAGE_KEYS.MITRE_VERSION_UPGRADED_CALLOUT;

const renderCallout = () =>
  render(
    <TestProviders>
      <MitreVersionUpgradedCallout />
    </TestProviders>
  );

describe('MitreVersionUpgradedCallout', () => {
  beforeEach(() => {
    localStorage.removeItem(DISMISSAL_STORAGE_KEY);
    // Default: no managed version available — falls back to the legacy constant.
    mockUseMitreConfiguration.mockReturnValue({ frameworkVersion: undefined });
  });

  it('renders the callout when no dismissal flag is present', async () => {
    renderCallout();

    expect(await screen.findByTestId('mitreVersionUpgradedCallout')).toBeInTheDocument();
    expect(screen.getByTestId('mitreVersionUpgradedCalloutLearnMoreLink')).toBeInTheDocument();
    expect(screen.getByTestId('mitreVersionUpgradedCalloutCoverageLink')).toBeInTheDocument();
  });

  it('renders the inline coverage link with the expected label', async () => {
    renderCallout();

    const link = await screen.findByTestId('mitreVersionUpgradedCalloutCoverageLink');
    expect(link).toHaveTextContent('MITRE ATT&CK® coverage page');
    // The actual href is built via `useGetSecuritySolutionUrl(SecurityPageName.coverageOverview)`,
    // which depends on deep-link plumbing not wired up in TestProviders. The URL itself is
    // covered by the standard deep-link infrastructure shared with RuleGapsCallout.
  });

  it('mentions the currently bundled MITRE ATT&CK version in the title', async () => {
    renderCallout();

    const callout = await screen.findByTestId('mitreVersionUpgradedCallout');
    expect(callout.textContent).toContain(`MITRE ATT&CK® updated to ${MITRE_ATTACK_VERSION}`);
  });

  it('displays the managed framework version in the title when available', async () => {
    mockUseMitreConfiguration.mockReturnValue({ frameworkVersion: '16.1' });

    renderCallout();

    const callout = await screen.findByTestId('mitreVersionUpgradedCallout');
    // The managed adapter strips the leading 'v'; the component re-adds it at the display site.
    expect(callout.textContent).toContain('MITRE ATT&CK® updated to v16.1');
  });

  it('does not render when the dismissal flag is already set', () => {
    localStorage.setItem(DISMISSAL_STORAGE_KEY, 'true');

    renderCallout();

    expect(screen.queryByTestId('mitreVersionUpgradedCallout')).not.toBeInTheDocument();
  });

  it('persists dismissal and unmounts after the close button is clicked', async () => {
    const user = userEvent.setup();

    renderCallout();

    const callout = await screen.findByTestId('mitreVersionUpgradedCallout');
    expect(callout).toBeInTheDocument();

    const dismissButton = screen.getByLabelText(/dismiss/i);
    await user.click(dismissButton);

    expect(screen.queryByTestId('mitreVersionUpgradedCallout')).not.toBeInTheDocument();
    expect(localStorage.getItem(DISMISSAL_STORAGE_KEY)).toBe('true');
  });
});

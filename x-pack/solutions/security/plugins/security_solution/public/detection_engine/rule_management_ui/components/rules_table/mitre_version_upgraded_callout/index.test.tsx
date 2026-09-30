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
import { MitreVersionUpgradedCallout } from '.';

const dismissalKeyFor = (displayVersion: string) =>
  `securitySolution.rulesManagementPage.mitreVersionUpgradedCallout.${displayVersion}`;

const mockUseIsExperimentalFeatureEnabled = jest.fn();
jest.mock('../../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: (...args: unknown[]) =>
    mockUseIsExperimentalFeatureEnabled(...args),
}));

const mockUseMitreConfiguration = jest.fn();
jest.mock('../../../../../common/hooks/mitre/use_mitre_configuration', () => ({
  useMitreConfiguration: (...args: unknown[]) => mockUseMitreConfiguration(...args),
}));

// Version returned by the mock — raw (adapter-normalised, no leading 'v').
const MOCK_RAW_VERSION = '16.1';
// Display form used in localStorage keys and UI text.
const MOCK_DISPLAY_VERSION = `v${MOCK_RAW_VERSION}`;
const MOCK_DISMISSAL_KEY = dismissalKeyFor(MOCK_DISPLAY_VERSION);

const renderCallout = () =>
  render(
    <TestProviders>
      <MitreVersionUpgradedCallout />
    </TestProviders>
  );

describe('MitreVersionUpgradedCallout', () => {
  beforeEach(() => {
    localStorage.clear();
    // The callout is gated behind the mitreAttackUpdatesUIEnabled feature flag.
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    // Default: managed version is resolved and available.
    mockUseMitreConfiguration.mockReturnValue({
      frameworkVersion: MOCK_RAW_VERSION,
      isError: false,
    });
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

  it('displays the resolved framework version (v-prefixed) in the title', async () => {
    renderCallout();

    const callout = await screen.findByTestId('mitreVersionUpgradedCallout');
    expect(callout.textContent).toContain(`MITRE ATT&CK® updated to ${MOCK_DISPLAY_VERSION}`);
  });

  it('does not render when the dismissal flag is already set for the resolved version', () => {
    localStorage.setItem(MOCK_DISMISSAL_KEY, 'true');

    renderCallout();

    expect(screen.queryByTestId('mitreVersionUpgradedCallout')).not.toBeInTheDocument();
  });

  it('persists dismissal under the resolved-version key and unmounts after the close button is clicked', async () => {
    const user = userEvent.setup();

    renderCallout();

    const callout = await screen.findByTestId('mitreVersionUpgradedCallout');
    expect(callout).toBeInTheDocument();

    const dismissButton = screen.getByLabelText(/dismiss/i);
    await user.click(dismissButton);

    expect(screen.queryByTestId('mitreVersionUpgradedCallout')).not.toBeInTheDocument();
    expect(localStorage.getItem(MOCK_DISMISSAL_KEY)).toBe('true');
  });

  it('a dismissal stored under version A does not suppress the callout for version B', async () => {
    const versionAKey = dismissalKeyFor('v15.0');
    localStorage.setItem(versionAKey, 'true');

    // Component receives a different resolved version.
    mockUseMitreConfiguration.mockReturnValue({
      frameworkVersion: MOCK_RAW_VERSION,
      isError: false,
    });

    renderCallout();

    // Callout for the new version must still appear.
    expect(await screen.findByTestId('mitreVersionUpgradedCallout')).toBeInTheDocument();
  });

  it('renders nothing when frameworkVersion is undefined', () => {
    mockUseMitreConfiguration.mockReturnValue({ frameworkVersion: undefined, isError: false });

    renderCallout();

    expect(screen.queryByTestId('mitreVersionUpgradedCallout')).not.toBeInTheDocument();
  });

  it('renders nothing when isError is true', () => {
    mockUseMitreConfiguration.mockReturnValue({
      frameworkVersion: MOCK_RAW_VERSION,
      isError: true,
    });

    renderCallout();

    expect(screen.queryByTestId('mitreVersionUpgradedCallout')).not.toBeInTheDocument();
  });

  it('renders nothing when the mitreAttackUpdatesUIEnabled experimental flag is off', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    renderCallout();

    expect(screen.queryByTestId('mitreVersionUpgradedCallout')).not.toBeInTheDocument();
  });
});

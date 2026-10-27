/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { TestProviders } from '../../../../common/mock';
import { useCoverageOverviewDashboardContext } from './coverage_overview_dashboard_context';
import { CoverageOverviewAppHeader } from './coverage_overview_app_header';

jest.mock('../../../../common/lib/kibana');
jest.mock('./coverage_overview_dashboard_context');

jest.mock('../../../../common/components/app_header/use_ml_job_settings_menu_item', () => ({
  useMlJobSettingsMenuItem: () => ({ item: undefined, flyout: null }),
}));

jest.mock('../../../../common/components/app_header/use_add_integrations_menu_item', () => ({
  useAddIntegrationsMenuItem: () => undefined,
}));

const mockUseAvailableMitreFrameworks = jest.fn();
jest.mock('../../../../common/hooks/mitre/use_available_mitre_frameworks', () => ({
  useAvailableMitreFrameworks: () => mockUseAvailableMitreFrameworks(),
}));

const setFramework = jest.fn();

const mockContext = (framework: string) => {
  (useCoverageOverviewDashboardContext as jest.Mock).mockReturnValue({
    state: { framework },
    actions: { setFramework },
  });
};

const renderHeader = () =>
  render(
    <TestProviders>
      <MemoryRouter>
        <MockAppHeaderProvider>
          <CoverageOverviewAppHeader />
        </MockAppHeaderProvider>
      </MemoryRouter>
    </TestProviders>
  );

describe('CoverageOverviewAppHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContext('enterprise');
    mockUseAvailableMitreFrameworks.mockReturnValue(['enterprise', 'atlas']);
  });

  it('renders the page title', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('MITRE coverage');
  });

  it('does not render a back link', () => {
    renderHeader();

    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
  });

  it.each([
    ['enterprise', 'MITRE ATT&CK'],
    ['atlas', 'MITRE ATLAS'],
  ])('describes the coverage of the selected %s framework', (framework, frameworkLabel) => {
    mockContext(framework);
    renderHeader();

    expect(
      screen.getByText(
        `Your current coverage of ${frameworkLabel} tactics and techniques, based on installed rules.`,
        { exact: false }
      )
    ).toBeInTheDocument();
  });

  it('links the description to the MITRE coverage documentation', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: /learn more/i })).toHaveAttribute(
      'href',
      expect.stringContaining('mitre-attack-coverage')
    );
  });

  it('renders a tab per available framework with the selected framework selected', () => {
    mockContext('atlas');
    renderHeader();

    expect(screen.getByTestId('coverageOverviewFrameworkTab-enterprise')).toHaveTextContent(
      'MITRE ATT&CK'
    );
    expect(screen.getByTestId('coverageOverviewFrameworkTab-enterprise')).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(screen.getByTestId('coverageOverviewFrameworkTab-atlas')).toHaveTextContent(
      'MITRE ATLAS'
    );
    expect(screen.getByTestId('coverageOverviewFrameworkTab-atlas')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('selects the clicked framework', async () => {
    renderHeader();

    await userEvent.click(screen.getByTestId('coverageOverviewFrameworkTab-atlas'));

    expect(setFramework).toHaveBeenCalledWith('atlas');
  });

  it('does not render the framework tabs when only one framework is available', () => {
    mockUseAvailableMitreFrameworks.mockReturnValue(['enterprise']);
    renderHeader();

    expect(screen.queryByTestId('coverageOverviewFrameworkTab-enterprise')).not.toBeInTheDocument();
  });
});

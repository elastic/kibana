/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import {
  EntityAnalyticsHealth,
  EntityAnalyticsErrorPanel,
  EntityAnalyticsToggle,
} from './entity_analytics_toggle';
import type { EntityAnalyticsStatus } from '../hooks/use_entity_analytics_status';

const mockToggle = jest.fn();
jest.mock('../hooks/use_toggle_entity_analytics', () => ({
  useToggleEntityAnalytics: () => mockUseToggleReturn,
}));

let mockUseToggleReturn: {
  status: EntityAnalyticsStatus;
  isLoading: boolean;
  toggle: jest.Mock;
  errors: { riskEngine: string[]; entityStore: string[] };
};

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('EntityAnalyticsHealth', () => {
  it('shows On when status is enabled', () => {
    render(<EntityAnalyticsHealth status="enabled" />);
    expect(screen.getByText('On')).toBeInTheDocument();
  });

  it('shows On when status is partially_enabled', () => {
    render(<EntityAnalyticsHealth status="partially_enabled" />);
    expect(screen.getByText('On')).toBeInTheDocument();
  });

  it('shows Off when status is disabled', () => {
    render(<EntityAnalyticsHealth status="disabled" />);
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('shows Off when status is not_installed', () => {
    render(<EntityAnalyticsHealth status="not_installed" />);
    expect(screen.getByText('Off')).toBeInTheDocument();
  });
});

describe('EntityAnalyticsErrorPanel', () => {
  it('renders nothing when there are no errors', () => {
    const { container } = render(
      <EntityAnalyticsErrorPanel riskEngineErrors={[]} entityStoreErrors={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders error callout with risk engine errors', () => {
    render(
      <EntityAnalyticsErrorPanel
        riskEngineErrors={['Risk engine init failed']}
        entityStoreErrors={[]}
      />
    );
    expect(screen.getByTestId('entity-analytics-error-panel')).toBeInTheDocument();
    expect(screen.getByText('Risk engine init failed')).toBeInTheDocument();
  });

  it('renders both risk and entity store errors', () => {
    render(
      <EntityAnalyticsErrorPanel
        riskEngineErrors={['Risk error']}
        entityStoreErrors={['Store error']}
      />
    );
    expect(screen.getByText('Risk error')).toBeInTheDocument();
    expect(screen.getByText('Store error')).toBeInTheDocument();
  });
});

describe('EntityAnalyticsToggle', () => {
  const defaultProps = {
    hasAllRequiredPrivileges: true,
    isPrivilegesLoading: false,
    selectedSettingsMatchSavedSettings: true,
    onSaveSettings: jest.fn().mockResolvedValue(undefined),
    isSavingSettings: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToggleReturn = {
      status: 'not_installed',
      isLoading: false,
      toggle: mockToggle,
      errors: { riskEngine: [], entityStore: [] },
    };
  });

  it('renders an unchecked switch when status is not_installed', () => {
    render(<EntityAnalyticsToggle {...defaultProps} />, { wrapper: Wrapper });
    const toggle = screen.getByTestId('entity-analytics-switch');
    expect(toggle).not.toBeChecked();
  });

  it('renders a checked switch when status is enabled', () => {
    mockUseToggleReturn.status = 'enabled';
    render(<EntityAnalyticsToggle {...defaultProps} />, { wrapper: Wrapper });
    const toggle = screen.getByTestId('entity-analytics-switch');
    expect(toggle).toBeChecked();
  });

  it('renders a checked switch when status is partially_enabled', () => {
    mockUseToggleReturn.status = 'partially_enabled';
    render(<EntityAnalyticsToggle {...defaultProps} />, { wrapper: Wrapper });
    const toggle = screen.getByTestId('entity-analytics-switch');
    expect(toggle).toBeChecked();
  });

  it('disables the switch when loading', () => {
    mockUseToggleReturn.status = 'enabling';
    mockUseToggleReturn.isLoading = true;
    render(<EntityAnalyticsToggle {...defaultProps} />, { wrapper: Wrapper });
    const toggle = screen.getByTestId('entity-analytics-switch');
    expect(toggle).toBeDisabled();
  });

  it('shows loading spinner when isLoading', () => {
    mockUseToggleReturn.isLoading = true;
    render(<EntityAnalyticsToggle {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByTestId('entity-analytics-status-loading')).toBeInTheDocument();
  });

  it('calls toggle when switch is clicked', () => {
    render(<EntityAnalyticsToggle {...defaultProps} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByTestId('entity-analytics-switch'));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('disables the switch when status is error', () => {
    mockUseToggleReturn.status = 'error';
    render(<EntityAnalyticsToggle {...defaultProps} />, { wrapper: Wrapper });
    const toggle = screen.getByTestId('entity-analytics-switch');
    expect(toggle).toBeDisabled();
  });

  it('disables the switch when privileges are missing', () => {
    const props = {
      ...defaultProps,
      hasAllRequiredPrivileges: false,
    };

    render(<EntityAnalyticsToggle {...props} />, { wrapper: Wrapper });
    const toggle = screen.getByTestId('entity-analytics-switch');
    expect(toggle).toBeDisabled();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntegrationsFacets } from '../../../constants';
import { IntegrationViewFacets, ALL, INSTALLED } from './view_facets';
import { useNavigation } from '../../../../common/lib/kibana';
import { SecurityPageName } from '@kbn/deeplinks-security';

jest.mock('../../../../common/lib/kibana', () => ({
  useNavigation: jest.fn(),
}));

describe('IntegrationViewFacets', () => {
  const mockNavigateTo = jest.fn();

  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({
      navigateTo: mockNavigateTo,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    allCount: 10,
    installedCount: 5,
    selectedFacet: IntegrationsFacets.available,
  };

  it('renders the "All integrations" and "Installed integrations" buttons', () => {
    render(<IntegrationViewFacets {...defaultProps} />);

    expect(screen.getByText(ALL)).toBeInTheDocument();
    expect(screen.getByText(INSTALLED)).toBeInTheDocument();
  });

  it('calls navigateTo with the correct path when "All integrations" is clicked', () => {
    render(<IntegrationViewFacets {...defaultProps} />);

    const allButton = screen.getByTestId('configurations.integrationsAll');
    fireEvent.click(allButton);

    expect(mockNavigateTo).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.configurationsIntegrations,
      path: 'browse',
    });
  });

  it('calls navigateTo with the correct path when "Installed integrations" is clicked', () => {
    render(
      <IntegrationViewFacets {...defaultProps} selectedFacet={IntegrationsFacets.installed} />
    );

    const installedButton = screen.getByTestId('configurations.integrationsInstalled');
    fireEvent.click(installedButton);

    expect(mockNavigateTo).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.configurationsIntegrations,
      path: 'installed',
    });
  });

  it('highlights the correct button based on the selectedFacet prop', () => {
    const { rerender } = render(<IntegrationViewFacets {...defaultProps} />);

    const allButton = screen.getByText('All integrations');
    const installedButton = screen.getByText('Installed integrations');

    const selectedFacetClass = 'euiFacetButton__text css-kw0vmr-euiFacetButton__text-isSelected';

    // Check if the "All integrations" button is selected
    expect(allButton).toHaveClass(selectedFacetClass);
    expect(installedButton).not.toHaveClass(selectedFacetClass);

    // Rerender with the "Installed integrations" selected
    rerender(
      <IntegrationViewFacets {...defaultProps} selectedFacet={IntegrationsFacets.installed} />
    );

    // Check if the "Installed integrations" button is selected
    expect(allButton).not.toHaveClass(selectedFacetClass);
    expect(installedButton).toHaveClass(selectedFacetClass);
  });
});

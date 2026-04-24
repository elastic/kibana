/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { InfoPanel } from './info_panel';

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('InfoPanel', () => {
  it('renders with the correct title', () => {
    render(
      <InfoPanel title="Summary">
        <p>Content</p>
      </InfoPanel>
    );
    expect(screen.getByText('Summary')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <InfoPanel title="Details">
        <p>This is the panel content</p>
      </InfoPanel>
    );
    expect(screen.getByText('This is the panel content')).toBeInTheDocument();
  });

  it('renders header right content when provided', () => {
    render(
      <InfoPanel title="Details" headerRightContent={<button>Action</button>}>
        <p>Content</p>
      </InfoPanel>
    );
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('does not render header right content when not provided', () => {
    render(
      <InfoPanel title="Details">
        <p>Content</p>
      </InfoPanel>
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has the correct test subject', () => {
    const { container } = render(
      <InfoPanel title="Test">
        <p>Content</p>
      </InfoPanel>
    );
    expect(
      container.querySelector('[data-test-subj="sigeventsOverviewInfoPanel"]')
    ).toBeInTheDocument();
  });

  describe('collapsible', () => {
    it('hides the children by default when collapsible and initialCollapsed', () => {
      renderWithIntl(
        <InfoPanel title="Details" collapsible initialCollapsed>
          <p>hidden content</p>
        </InfoPanel>
      );

      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.queryByText('hidden content')).not.toBeInTheDocument();
      expect(screen.getByTestId('sigeventsOverviewInfoPanelToggle')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    });

    it('shows the children by default when collapsible and not initialCollapsed', () => {
      renderWithIntl(
        <InfoPanel title="Details" collapsible initialCollapsed={false}>
          <p>visible content</p>
        </InfoPanel>
      );

      expect(screen.getByText('visible content')).toBeInTheDocument();
      expect(screen.getByTestId('sigeventsOverviewInfoPanelToggle')).toHaveAttribute(
        'aria-expanded',
        'true'
      );
    });

    it('toggles the children when the header is clicked', () => {
      renderWithIntl(
        <InfoPanel title="Details" collapsible initialCollapsed>
          <p>togglable content</p>
        </InfoPanel>
      );

      const toggle = screen.getByTestId('sigeventsOverviewInfoPanelToggle');
      fireEvent.click(toggle);
      expect(screen.getByText('togglable content')).toBeInTheDocument();

      fireEvent.click(toggle);
      expect(screen.queryByText('togglable content')).not.toBeInTheDocument();
    });
  });
});

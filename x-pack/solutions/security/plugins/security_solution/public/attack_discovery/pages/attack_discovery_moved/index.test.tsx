/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';

import { TestProviders } from '../../../common/mock';
import { mockHistory } from '../../../common/utils/route/mocks';
import { AttacksEventTypes } from '../../../common/lib/telemetry';
import { AttackDiscoveryMovedPage } from '.';

const mockReportEvent = jest.fn();
const mockGetUrlForApp = jest.fn(() => '/app/management/kibana/settings?query=Enable+alerts');

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: { getUrlForApp: mockGetUrlForApp },
      telemetry: { reportEvent: mockReportEvent },
    },
  }),
}));

jest.mock('./assets/simplify.light.svg', () => 'simplify-light-svg-stub');
jest.mock('./assets/simplify.dark.svg', () => 'simplify-dark-svg-stub');

describe('AttackDiscoveryMovedPage', () => {
  beforeEach(() => {
    mockReportEvent.mockClear();
  });

  const renderComponent = () =>
    render(
      <TestProviders>
        <Router history={mockHistory}>
          <AttackDiscoveryMovedPage />
        </Router>
      </TestProviders>
    );

  it('renders the page container', () => {
    renderComponent();
    expect(screen.getByTestId('attackDiscoveryMovedPage')).toBeInTheDocument();
  });

  it('renders the title', () => {
    renderComponent();
    expect(screen.getByTestId('attackDiscoveryMovedTitle')).toBeInTheDocument();
    expect(screen.getByTestId('attackDiscoveryMovedTitle')).toHaveTextContent(
      'Attack Discovery has moved'
    );
  });

  it('renders the description body', () => {
    renderComponent();
    expect(screen.getByTestId('attackDiscoveryMovedBody')).toBeInTheDocument();
  });

  it('renders the Go to Attacks button', () => {
    renderComponent();
    expect(screen.getByTestId('goToAttacksButton')).toBeInTheDocument();
  });

  it('fires view_attacks telemetry when the Go to Attacks button is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('goToAttacksButton'));
    expect(mockReportEvent).toHaveBeenCalledWith(AttacksEventTypes.FeaturePromotionCalloutAction, {
      action: 'view_attacks',
    });
  });

  it('renders the opt-out note with a link to Advanced Settings', () => {
    renderComponent();
    expect(screen.getByTestId('attackDiscoveryMovedOptOut')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Advanced Settings/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('management'));
  });

  it('does not render any attack discovery content (actions, history)', () => {
    renderComponent();
    expect(screen.queryByTestId('actions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('history')).not.toBeInTheDocument();
  });
});

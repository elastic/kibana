/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterManager } from '@kbn/data-plugin/public';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { AlertSelection } from '.';
import { useKibana } from '../../../../common/lib/kibana';
import { TestProviders } from '../../../../common/mock';
import { CUSTOMIZE_THE_CONNECTOR_AND_ALERTS } from './translations';

jest.mock('react-router', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('default'),
}));

const defaultProps = {
  connectorId: undefined,
  alertsPreviewStackBy0: 'defaultAlertPreview',
  alertSummaryStackBy0: 'defaultAlertSummary',
  filterManager: jest.fn() as unknown as FilterManager,
  settings: {
    end: '2024-10-01T00:00:00.000Z',
    filters: [],
    query: { query: '', language: 'kuery' },
    size: 100,
    start: '2024-09-01T00:00:00.000Z',
  },
  onConnectorIdSelected: jest.fn(),
  onSettingsChanged: jest.fn(),
  setAlertsPreviewStackBy0: jest.fn(),
  setAlertSummaryStackBy0: jest.fn(),
  showConnectorSelector: true,
  stats: null,
};

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('AlertSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        lens: {
          EmbeddableComponent: () => <div data-test-subj="mockEmbeddableComponent" />,
        },
        unifiedSearch: {
          ui: {
            SearchBar: () => <div data-test-subj="mockSearchBar" />,
          },
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);
  });

  it('renders the customize alerts text', () => {
    render(
      <TestProviders>
        <AlertSelection {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText(CUSTOMIZE_THE_CONNECTOR_AND_ALERTS)).toBeInTheDocument();
  });

  it('renders the AlertSelectionQuery', () => {
    render(
      <TestProviders>
        <AlertSelection {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('customizeAlerts')).toBeInTheDocument();
  });

  it('renders the AlertSelectionRange', () => {
    render(
      <TestProviders>
        <AlertSelection {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('alertSelection')).toBeInTheDocument();
  });

  it('selects the first tab by default', () => {
    render(
      <TestProviders>
        <AlertSelection {...defaultProps} />
      </TestProviders>
    );

    const firstTab = screen.getAllByRole('tab')[0];

    expect(firstTab).toHaveAttribute('aria-selected', 'true');
  });

  it('changes the selected tab on click', () => {
    render(
      <TestProviders>
        <AlertSelection {...defaultProps} />
      </TestProviders>
    );

    const secondTab = screen.getAllByRole('tab')[1];
    expect(secondTab).toHaveAttribute('aria-selected', 'false'); // precondition: the first tab is selected

    fireEvent.click(secondTab);

    expect(secondTab).toHaveAttribute('aria-selected', 'true');
  });

  it('does not render the connector selector or customize text when showConnectorSelector is false', () => {
    render(
      <TestProviders>
        <AlertSelection {...defaultProps} showConnectorSelector={false} />
      </TestProviders>
    );

    expect(screen.queryByTestId('customizeAlerts')).toBeNull();
  });
});

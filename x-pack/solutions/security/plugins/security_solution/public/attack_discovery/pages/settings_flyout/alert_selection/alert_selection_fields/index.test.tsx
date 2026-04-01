/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterManager } from '@kbn/data-plugin/public';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { AlertSelectionFields } from '.';
import { TestProviders } from '../../../../../common/mock';
import { useKibana } from '../../../../../common/lib/kibana';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { CUSTOMIZE_THE_CONNECTOR_AND_ALERTS } from '../translations';

jest.mock('react-router', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));
jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../sourcerer/containers');
jest.mock('../../../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('default'),
}));

const defaultProps = {
  connectorId: 'test-connector',
  filterManager: jest.fn() as unknown as FilterManager,
  onConnectorIdSelected: jest.fn(),
  onSettingsChanged: jest.fn(),
  settings: {
    end: '2024-10-01T00:00:00.000Z',
    filters: [],
    query: { query: '', language: 'kuery' },
    size: 100,
    start: '2024-09-01T00:00:00.000Z',
  },
  showConnectorSelector: true,
};

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSourcererDataView = useSourcererDataView as jest.MockedFunction<
  typeof useSourcererDataView
>;

describe('AlertSelectionFields', () => {
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

    mockUseSourcererDataView.mockReturnValue({
      sourcererDataView: {},
      loading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useSourcererDataView>>);
  });

  it('renders the alertSelectionFields form', () => {
    render(
      <TestProviders>
        <AlertSelectionFields {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('alertSelectionFields')).toBeInTheDocument();
  });

  it('renders the ConnectorField when showConnectorSelector is true', () => {
    render(
      <TestProviders>
        <AlertSelectionFields {...defaultProps} showConnectorSelector={true} />
      </TestProviders>
    );

    expect(screen.getByTestId('connectorFieldDescription')).toBeInTheDocument();
    expect(screen.getByText(CUSTOMIZE_THE_CONNECTOR_AND_ALERTS)).toBeInTheDocument();
  });

  it('does not render the ConnectorField when showConnectorSelector is false', () => {
    render(
      <TestProviders>
        <AlertSelectionFields {...defaultProps} showConnectorSelector={false} />
      </TestProviders>
    );

    expect(screen.queryByTestId('connectorFieldDescription')).toBeNull();
    expect(screen.queryByText(CUSTOMIZE_THE_CONNECTOR_AND_ALERTS)).toBeNull();
  });

  it('still renders the custom query and alert range fields when showConnectorSelector is false', () => {
    render(
      <TestProviders>
        <AlertSelectionFields {...defaultProps} showConnectorSelector={false} />
      </TestProviders>
    );

    expect(screen.getByTestId('alertSelectionFields')).toBeInTheDocument();
  });
});

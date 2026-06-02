/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { PreviewTab } from '.';
import { useKibana } from '../../../../../common/lib/kibana';
import { TestProviders } from '../../../../../common/mock';
import { useSignalIndex } from '../../../../../detections/containers/detection_engine/alerts/use_signal_index';

const mockDispatch = jest.fn();

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../detections/containers/detection_engine/alerts/use_signal_index');
jest.mock('react-router-dom', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSignalIndex = useSignalIndex as jest.MockedFunction<typeof useSignalIndex>;

describe('PreviewTab', () => {
  const defaultProps = {
    embeddableId: 'test-embeddable-id',
    end: '2024-09-01T00:00:00.000Z',
    filters: [],
    getLensAttributes: jest.fn(),
    getPreviewEsqlQuery: jest.fn(),
    maxAlerts: 100,
    query: { query: '', language: 'kuery' },
    setTableStackBy0: jest.fn(),
    start: '2024-08-01T00:00:00.000Z',
    tableStackBy0: '',
  };

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

    mockUseSignalIndex.mockReturnValue({
      loading: false,
      signalIndexExists: true,
      signalIndexName: 'mock-signal-index',
      signalIndexMappingOutdated: false,
      createDeSignalIndex: jest.fn(),
    });
  });

  it('renders the preview tab', () => {
    render(
      <TestProviders>
        <PreviewTab {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('previewTab')).toBeInTheDocument();
  });

  it('renders the StackByComboBox', () => {
    render(
      <TestProviders>
        <PreviewTab {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('selectField')).toBeInTheDocument();
  });

  it('renders the reset button', () => {
    render(
      <TestProviders>
        <PreviewTab {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('reset')).toBeInTheDocument();
  });

  it('calls setTableStackBy0 with the RESET_FIELD when the reset button is clicked', () => {
    render(
      <TestProviders>
        <PreviewTab {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('reset'));

    expect(defaultProps.setTableStackBy0).toHaveBeenCalledWith('kibana.alert.rule.name');
  });

  it('renders the empty prompt when tableStackBy0 is empty', () => {
    render(
      <TestProviders>
        <PreviewTab {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('emptyPrompt')).toBeInTheDocument();
  });

  it('does NOT render the empty prompt when tableStackBy0 is NOT empty', () => {
    render(
      <TestProviders>
        <PreviewTab {...defaultProps} tableStackBy0="test" />
      </TestProviders>
    );

    expect(screen.queryByTestId('emptyPrompt')).not.toBeInTheDocument();
  });

  it('returns null when signalIndexName is null', () => {
    mockUseSignalIndex.mockReturnValue({
      loading: false,
      signalIndexExists: false,
      signalIndexName: null, // <-- signalIndexName is null
      signalIndexMappingOutdated: false,
      createDeSignalIndex: jest.fn(),
    });

    const { container } = render(
      <TestProviders>
        <PreviewTab {...defaultProps} />
      </TestProviders>
    );

    expect(container.firstChild).toBeNull();
  });

  it('limits the fields in the StackByComboBox to the fields in the signal index', () => {
    render(
      <TestProviders>
        <PreviewTab {...defaultProps} />
      </TestProviders>
    );

    expect(mockDispatch).toHaveBeenCalledWith({
      payload: {
        id: 'alerts',
        selectedDataViewId: 'mock-signal-index',
        selectedPatterns: ['mock-signal-index'],
        shouldValidateSelectedPatterns: false,
      },
      type: 'x-pack/security_solution/local/sourcerer/SET_SELECTED_DATA_VIEW',
    });
  });
});

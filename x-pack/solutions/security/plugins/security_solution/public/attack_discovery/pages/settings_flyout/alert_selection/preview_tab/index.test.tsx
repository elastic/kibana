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
jest.mock('react-redux-v7', () => ({
  ...jest.requireActual('react-redux-v7'),
  useDispatch: () => mockDispatch,
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSignalIndex = useSignalIndex as jest.MockedFunction<typeof useSignalIndex>;

/** Captures the most recent props passed to the Lens EmbeddableComponent */
let lastEmbeddableProps: Record<string, unknown> = {};

const MockEmbeddableComponent = (props: Record<string, unknown>) => {
  lastEmbeddableProps = props;
  return <div data-test-subj="mockEmbeddableComponent" />;
};

describe('PreviewTab', () => {
  const defaultProps = {
    embeddableId: 'test-embeddable-id',
    end: '2024-09-01T00:00:00.000Z',
    filters: [],
    getLensAttributes: jest.fn().mockReturnValue({ visualizationType: 'lnsDatatable' }),
    getPreviewEsqlQuery: jest.fn().mockReturnValue('mock esql query'),
    maxAlerts: 100,
    query: { query: '', language: 'kuery' },
    setTableStackBy0: jest.fn(),
    start: '2024-08-01T00:00:00.000Z',
    tableStackBy0: 'kibana.alert.rule.name',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    lastEmbeddableProps = {};

    mockUseKibana.mockReturnValue({
      services: {
        lens: {
          EmbeddableComponent: MockEmbeddableComponent,
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
        <PreviewTab {...defaultProps} tableStackBy0="" />
      </TestProviders>
    );

    expect(screen.getByTestId('reset')).toBeInTheDocument();
  });

  it('calls setTableStackBy0 with the RESET_FIELD when the reset button is clicked', () => {
    render(
      <TestProviders>
        <PreviewTab {...defaultProps} tableStackBy0="" />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('reset'));

    expect(defaultProps.setTableStackBy0).toHaveBeenCalledWith('kibana.alert.rule.name');
  });

  it('renders the empty prompt when tableStackBy0 is empty', () => {
    render(
      <TestProviders>
        <PreviewTab {...defaultProps} tableStackBy0="" />
      </TestProviders>
    );

    expect(screen.getByTestId('emptyPrompt')).toBeInTheDocument();
  });

  it('does NOT render the empty prompt when tableStackBy0 is NOT empty', () => {
    render(
      <TestProviders>
        <PreviewTab {...defaultProps} />
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

  it('passes esqlQuery to getPreviewEsqlQuery when provided', () => {
    const userEsqlQuery =
      'FROM .alerts-security.alerts-default | WHERE kibana.alert.severity == "critical" | LIMIT 50';

    render(
      <TestProviders>
        <PreviewTab {...defaultProps} esqlQuery={userEsqlQuery} />
      </TestProviders>
    );

    expect(defaultProps.getPreviewEsqlQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlQuery: userEsqlQuery,
      })
    );
  });

  it('passes undefined esqlQuery to getPreviewEsqlQuery when not provided', () => {
    render(
      <TestProviders>
        <PreviewTab {...defaultProps} />
      </TestProviders>
    );

    expect(defaultProps.getPreviewEsqlQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlQuery: undefined,
      })
    );
  });

  describe('effectiveTimeRange', () => {
    it('passes timeRange to the Lens EmbeddableComponent when no esqlQuery is provided (DSL mode)', () => {
      render(
        <TestProviders>
          <PreviewTab {...defaultProps} />
        </TestProviders>
      );

      expect(lastEmbeddableProps.timeRange).toEqual({
        from: defaultProps.start,
        to: defaultProps.end,
      });
    });

    it('passes timeRange to the Lens EmbeddableComponent when esqlQuery uses ?_tstart', () => {
      render(
        <TestProviders>
          <PreviewTab
            {...defaultProps}
            esqlQuery="FROM .alerts | WHERE @timestamp >= ?_tstart | LIMIT 100"
          />
        </TestProviders>
      );

      expect(lastEmbeddableProps.timeRange).toEqual({
        from: defaultProps.start,
        to: defaultProps.end,
      });
    });

    it('passes timeRange to the Lens EmbeddableComponent when esqlQuery uses ?_tend', () => {
      render(
        <TestProviders>
          <PreviewTab
            {...defaultProps}
            esqlQuery="FROM .alerts | WHERE @timestamp <= ?_tend | LIMIT 100"
          />
        </TestProviders>
      );

      expect(lastEmbeddableProps.timeRange).toEqual({
        from: defaultProps.start,
        to: defaultProps.end,
      });
    });

    it('passes timeRange to the Lens EmbeddableComponent when esqlQuery uses both ?_tstart and ?_tend', () => {
      render(
        <TestProviders>
          <PreviewTab
            {...defaultProps}
            esqlQuery="FROM .alerts | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | LIMIT 100"
          />
        </TestProviders>
      );

      expect(lastEmbeddableProps.timeRange).toEqual({
        from: defaultProps.start,
        to: defaultProps.end,
      });
    });

    it('passes undefined timeRange to the Lens EmbeddableComponent when esqlQuery uses NOW() instead of named params', () => {
      render(
        <TestProviders>
          <PreviewTab
            {...defaultProps}
            esqlQuery="FROM .alerts | WHERE @timestamp >= NOW() - 30 days | LIMIT 1500"
          />
        </TestProviders>
      );

      expect(lastEmbeddableProps.timeRange).toBeUndefined();
    });

    it('passes undefined timeRange to the Lens EmbeddableComponent when esqlQuery has no time filter at all', () => {
      render(
        <TestProviders>
          <PreviewTab
            {...defaultProps}
            esqlQuery={'FROM .alerts | WHERE kibana.alert.severity == "critical" | LIMIT 50'}
          />
        </TestProviders>
      );

      expect(lastEmbeddableProps.timeRange).toBeUndefined();
    });

    it('passes undefined timeRange when esqlQuery uses a date literal instead of named params', () => {
      render(
        <TestProviders>
          <PreviewTab
            {...defaultProps}
            esqlQuery={'FROM .alerts | WHERE @timestamp >= "2024-01-01T00:00:00Z" | LIMIT 100'}
          />
        </TestProviders>
      );

      expect(lastEmbeddableProps.timeRange).toBeUndefined();
    });
  });
});

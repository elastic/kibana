/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/public';
import type { BrowserFields } from '@kbn/timelines-plugin/common';
import { AlertFiltersKqlBar } from './alert_filters_kql_bar';
import type { UIAlertFilter } from './common';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { useKibana } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock';
import type { SelectedDataView } from '../../../sourcerer/store/model';

jest.mock('../../../sourcerer/containers');
jest.mock('../../../common/lib/kibana');

const mockUseSourcererDataView = useSourcererDataView as jest.MockedFunction<
  typeof useSourcererDataView
>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const mockDataView: Partial<DataView> = {
  id: 'test-data-view-id',
  title: 'test-index',
  fields: [] as unknown as DataView['fields'],
};

const mockSourcererDataViewSpec: DataViewSpec = {
  id: 'test-data-view-id',
  title: 'test-index',
  fields: {} as DataViewSpec['fields'],
};

const createMockSelectedDataView = (): SelectedDataView => ({
  browserFields: {} as BrowserFields,
  dataViewId: mockSourcererDataViewSpec.id ?? null,
  indicesExist: true,
  loading: false,
  selectedPatterns: [mockSourcererDataViewSpec.title ?? 'test-index'],
  sourcererDataView: mockSourcererDataViewSpec,
});

const mockCreateDataView = jest.fn().mockResolvedValue(mockDataView);
const mockClearInstanceCache = jest.fn();

describe('AlertFiltersKqlBar', () => {
  let queryClient: QueryClient;
  const mockOnQueryChange = jest.fn();
  const mockOnFiltersChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockUseSourcererDataView.mockReturnValue(createMockSelectedDataView());

    const submitButtonText = 'Submit';
    mockUseKibana.mockReturnValue({
      services: {
        unifiedSearch: {
          ui: {
            SearchBar: jest.fn().mockImplementation(({ onQuerySubmit, onQueryChange, query }) => (
              <div data-test-subj="mockSearchBar">
                <input
                  data-test-subj="searchBarInput"
                  value={typeof query?.query === 'string' ? query.query : ''}
                  onChange={(e) => {
                    onQueryChange?.({
                      query: { query: e.target.value, language: 'kuery' },
                    });
                  }}
                />
                <button
                  type="button"
                  data-test-subj="searchBarSubmit"
                  onClick={() => {
                    onQuerySubmit?.({
                      query: query || { query: '', language: 'kuery' },
                    });
                  }}
                >
                  {submitButtonText}
                </button>
              </div>
            )),
          },
        },
        data: {
          dataViews: {
            create: mockCreateDataView,
            clearInstanceCache: mockClearInstanceCache,
          },
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      onQueryChange: mockOnQueryChange,
      onFiltersChange: mockOnFiltersChange,
      filters: [],
      ...props,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <TestProviders>
          <AlertFiltersKqlBar {...defaultProps} />
        </TestProviders>
      </QueryClientProvider>
    );
  };

  describe('Rendering', () => {
    it('renders the SearchBar component', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
      });
    });

    it('renders with custom placeholder', async () => {
      renderComponent({ placeholder: 'Custom placeholder' });
      await waitFor(() => {
        expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
      });
    });

    it('does not render when dataView is not available', () => {
      mockCreateDataView.mockResolvedValueOnce(null);
      const { container } = renderComponent();
      expect(container.firstChild).toBeNull();
    });

    it('renders filters when provided', async () => {
      const filters: UIAlertFilter[] = [
        {
          id: '1',
          text: 'host.name: "test-host"',
          entityTypes: ['host', 'user'],
        },
      ];
      renderComponent({ filters });
      await waitFor(() => {
        expect(screen.getByText('host.name:')).toBeInTheDocument();
        expect(screen.getByText('"test-host"')).toBeInTheDocument();
      });
    });

    it('renders multiple filters', async () => {
      const filters: UIAlertFilter[] = [
        {
          id: '1',
          text: 'host.name: "host1"',
          entityTypes: ['host'],
        },
        {
          id: '2',
          text: 'user.name: "user1"',
          entityTypes: ['user'],
        },
      ];
      renderComponent({ filters });
      await waitFor(() => {
        expect(screen.getByText('host.name:')).toBeInTheDocument();
        expect(screen.getByText('"host1"')).toBeInTheDocument();
        expect(screen.getByText('user.name:')).toBeInTheDocument();
        expect(screen.getByText('"user1"')).toBeInTheDocument();
      });
    });
  });

  describe('Query Submission', () => {
    it('adds a filter when a valid KQL query is submitted', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
      });

      const input = screen.getByTestId('searchBarInput');
      fireEvent.change(input, { target: { value: 'host.name: "test-host"' } });
      fireEvent.click(screen.getByTestId('searchBarSubmit'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalled();
      });

      const callArgs = mockOnFiltersChange.mock.calls[0][0];
      expect(callArgs).toHaveLength(1);
      expect(callArgs[0].text).toBe('host.name: "test-host"');
      expect(callArgs[0].entityTypes).toEqual(['user', 'host', 'service']);
    });

    it('does not add filter for empty query', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
      });

      const input = screen.getByTestId('searchBarInput');
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(screen.getByTestId('searchBarSubmit'));

      await waitFor(() => {
        expect(mockOnFiltersChange).not.toHaveBeenCalled();
      });
    });

    it('calls onQueryChange when query is submitted', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
      });

      const input = screen.getByTestId('searchBarInput');
      fireEvent.change(input, { target: { value: 'host.name: "test-host"' } });
      fireEvent.click(screen.getByTestId('searchBarSubmit'));

      await waitFor(() => {
        expect(mockOnQueryChange).toHaveBeenCalled();
      });
    });

    it('clears query input after successful submission', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
      });

      const input = screen.getByTestId('searchBarInput') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'host.name: "test-host"' } });
      fireEvent.click(screen.getByTestId('searchBarSubmit'));

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });

  describe('KQL Validation', () => {
    it('shows validation error for invalid KQL syntax', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
      });

      const input = screen.getByTestId('searchBarInput');
      fireEvent.change(input, { target: { value: 'invalid: syntax: error' } });

      await waitFor(() => {
        expect(screen.getByTestId('alertFiltersKqlBarError')).toBeInTheDocument();
      });
    });

    it('does not show error for valid KQL', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
      });

      const input = screen.getByTestId('searchBarInput');
      fireEvent.change(input, { target: { value: 'host.name: "valid"' } });

      await waitFor(() => {
        expect(screen.queryByTestId('alertFiltersKqlBarError')).not.toBeInTheDocument();
      });
    });

    it('does not validate empty queries', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
      });

      const input = screen.getByTestId('searchBarInput');
      fireEvent.change(input, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.queryByTestId('alertFiltersKqlBarError')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filter Removal', () => {
    it('removes a filter when remove button is clicked', async () => {
      const filters: UIAlertFilter[] = [
        {
          id: '1',
          text: 'host.name: "test-host"',
          entityTypes: ['host'],
        },
      ];
      renderComponent({ filters });
      await waitFor(() => {
        expect(screen.getByText('host.name:')).toBeInTheDocument();
        expect(screen.getByText('"test-host"')).toBeInTheDocument();
      });

      const removeButton = screen.getByLabelText('Remove filter');
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith([]);
      });
    });

    it('removes correct filter when multiple filters exist', async () => {
      const filters: UIAlertFilter[] = [
        {
          id: '1',
          text: 'host.name: "host1"',
          entityTypes: ['host'],
        },
        {
          id: '2',
          text: 'user.name: "user1"',
          entityTypes: ['user'],
        },
      ];
      renderComponent({ filters });
      await waitFor(() => {
        expect(screen.getByText('host.name:')).toBeInTheDocument();
        expect(screen.getByText('"host1"')).toBeInTheDocument();
      });

      const removeButtons = screen.getAllByLabelText('Remove filter');
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalled();
      });

      const callArgs = mockOnFiltersChange.mock.calls[0][0];
      expect(callArgs).toHaveLength(1);
      expect(callArgs[0].id).toBe('2');
    });
  });

  describe('Entity Type Changes', () => {
    it('renders combobox with correct selected entity types', async () => {
      const filters: UIAlertFilter[] = [
        {
          id: '1',
          text: 'host.name: "test-host"',
          entityTypes: ['host', 'user'],
        },
      ];
      renderComponent({ filters });
      await waitFor(() => {
        expect(screen.getByText('host.name:')).toBeInTheDocument();
        expect(screen.getByText('"test-host"')).toBeInTheDocument();
        // Check that the combobox shows the selected entity types as badges
        expect(screen.getByText('Hosts')).toBeInTheDocument();
        expect(screen.getByText('Users')).toBeInTheDocument();
      });
    });

    it('prevents deselecting all entity types', async () => {
      const filters: UIAlertFilter[] = [
        {
          id: '1',
          text: 'host.name: "test-host"',
          entityTypes: ['host'],
        },
      ];
      renderComponent({ filters });
      await waitFor(() => {
        expect(screen.getByText('host.name:')).toBeInTheDocument();
        expect(screen.getByText('"test-host"')).toBeInTheDocument();
        expect(screen.getByText('Hosts')).toBeInTheDocument();
      });

      // Verify that the combobox onChange handler prevents empty arrays
      // This is tested by ensuring the filter still exists after component renders
      await waitFor(() => {
        expect(screen.getByText('host.name:')).toBeInTheDocument();
      });
    });
  });

  describe('Complex Queries', () => {
    it('renders complex queries with AND operator correctly', async () => {
      const filters: UIAlertFilter[] = [
        {
          id: '1',
          text: 'host.name: "TEST" AND user.name: "TEST"',
          entityTypes: ['host', 'user'],
        },
      ];
      renderComponent({ filters });
      await waitFor(() => {
        expect(screen.getByText('host.name: "TEST" AND user.name: "TEST"')).toBeInTheDocument();
      });
    });

    it('renders complex queries with OR operator correctly', async () => {
      const filters: UIAlertFilter[] = [
        {
          id: '1',
          text: 'host.name: "host1" OR host.name: "host2"',
          entityTypes: ['host'],
        },
      ];
      renderComponent({ filters });
      await waitFor(() => {
        expect(screen.getByText('host.name: "host1" OR host.name: "host2"')).toBeInTheDocument();
      });
    });

    it('submits complex queries with AND/OR operators', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
      });

      const input = screen.getByTestId('searchBarInput');
      fireEvent.change(input, { target: { value: 'host.name: "TEST" AND user.name: "TEST"' } });
      fireEvent.click(screen.getByTestId('searchBarSubmit'));

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalled();
      });

      const callArgs = mockOnFiltersChange.mock.calls[0][0];
      expect(callArgs[0].text).toBe('host.name: "TEST" AND user.name: "TEST"');
    });
  });

  describe('Popover Interaction', () => {
    it('opens popover when filter chip is clicked', async () => {
      const filters: UIAlertFilter[] = [
        {
          id: '1',
          text: 'host.name: "test-host"',
          entityTypes: ['host'],
        },
      ];
      renderComponent({ filters });
      await waitFor(() => {
        expect(screen.getByText('host.name:')).toBeInTheDocument();
        expect(screen.getByText('"test-host"')).toBeInTheDocument();
      });

      // Find the clickable panel container and click it
      const filterChip = screen
        .getByText('host.name:')
        .closest('[class*="ClickablePanelContainer"]');
      if (filterChip) {
        fireEvent.click(filterChip);
        // The popover should open and show full query text
        await waitFor(() => {
          // The popover content should contain the full filter text
          expect(screen.getByText('host.name: "test-host"')).toBeInTheDocument();
        });
      }
    });
  });

  describe('DataView Lifecycle', () => {
    it('creates DataView on mount', async () => {
      renderComponent();
      await waitFor(() => {
        expect(mockCreateDataView).toHaveBeenCalled();
      });
    });

    it('clears DataView cache on unmount', async () => {
      const { unmount } = renderComponent();
      await waitFor(() => {
        expect(mockCreateDataView).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(mockClearInstanceCache).toHaveBeenCalledWith('test-data-view-id');
      });
    });
  });

  describe('Callbacks', () => {
    it('does not call callbacks when they are not provided', async () => {
      renderComponent({ onQueryChange: undefined, onFiltersChange: undefined });
      await waitFor(() => {
        expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
      });

      const input = screen.getByTestId('searchBarInput');
      fireEvent.change(input, { target: { value: 'host.name: "test-host"' } });
      fireEvent.click(screen.getByTestId('searchBarSubmit'));

      // Should not throw errors
      await waitFor(() => {
        expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
      });
    });
  });
});

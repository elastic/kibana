/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphGroupedNodePreviewPanel } from './graph_grouped_node_preview_panel';
import type { EntityItem } from '@kbn/cloud-security-posture-common/types/graph_entities/v1';
import type { EventOrAlertItem } from '@kbn/cloud-security-posture-common/types/graph_events/v1';
import { useFetchDocumentDetails } from './use_fetch_document_details';

import {
  LOADING_BODY_TEST_ID,
  EMPTY_BODY_TEST_ID,
  CONTENT_BODY_TEST_ID,
  PAGE_SIZE_BTN_TEST_ID,
  TOTAL_HITS_TEST_ID,
  ICON_TEST_ID,
  GROUPED_ITEMS_TYPE_TEST_ID,
  PAGINATION_BUTTON_NEXT_TEST_ID,
} from './test_ids';
import { GROUPED_PREVIEW_PAGINATION_SETTINGS_KEY } from './use_pagination';

// Mock the hook
jest.mock('./use_fetch_document_details');

const mockUseFetchDocumentDetails = useFetchDocumentDetails as jest.MockedFunction<
  typeof useFetchDocumentDetails
>;

const createMockHookResult = (
  overrides?: Partial<ReturnType<typeof useFetchDocumentDetails>>
): ReturnType<typeof useFetchDocumentDetails> => ({
  data: { items: [], totalRecords: 0 },
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
  refresh: jest.fn(),
  ...overrides,
});

describe('GraphGroupedNodePreviewPanel', () => {
  const defaultProps = {
    type: 'entities' as const,
    documentIds: ['doc-1', 'doc-2', 'doc-3'],
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-02T00:00:00.000Z',
  };

  let entityIdCounter = 0;

  const createEntityItem = (overrides?: Partial<EntityItem>): EntityItem => {
    entityIdCounter += 1;
    return {
      id: `entity-${entityIdCounter}`,
      type: 'host',
      icon: 'storage',
      name: 'Test Host',
      availableInEntityStore: true,
      ...overrides,
    } as EntityItem;
  };

  const createEventItem = (overrides?: Partial<EventOrAlertItem>): EventOrAlertItem => {
    entityIdCounter += 1;
    return {
      id: `event-${entityIdCounter}`,
      index: 'test-index',
      timestamp: '2024-01-01T12:00:00.000Z',
      ...overrides,
    } as EventOrAlertItem;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    entityIdCounter = 0;
    mockUseFetchDocumentDetails.mockReturnValue(createMockHookResult());
  });

  describe('Rendering States', () => {
    describe('Loading State', () => {
      it('should render LoadingBody when isLoading is true', () => {
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({
            isLoading: true,
          })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} />);

        expect(screen.getByTestId(LOADING_BODY_TEST_ID)).toBeInTheDocument();
        expect(screen.queryByTestId(CONTENT_BODY_TEST_ID)).not.toBeInTheDocument();
        expect(screen.queryByTestId(EMPTY_BODY_TEST_ID)).not.toBeInTheDocument();
      });

      it('should render LoadingBody for entities type during data fetch', () => {
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({
            isLoading: true,
          })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} type="entities" />);

        expect(screen.getByTestId(LOADING_BODY_TEST_ID)).toBeInTheDocument();
      });

      it('should render LoadingBody for events type during data fetch', () => {
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({
            isLoading: true,
          })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} type="events" />);

        expect(screen.getByTestId(LOADING_BODY_TEST_ID)).toBeInTheDocument();
      });
    });

    describe('Empty State', () => {
      it('should render EmptyBody when items array is empty after loading', () => {
        mockUseFetchDocumentDetails.mockReturnValue(createMockHookResult());

        render(<GraphGroupedNodePreviewPanel {...defaultProps} type="events" />);

        expect(screen.getByTestId(EMPTY_BODY_TEST_ID)).toBeInTheDocument();
        expect(screen.queryByTestId(LOADING_BODY_TEST_ID)).not.toBeInTheDocument();
        expect(screen.queryByTestId(CONTENT_BODY_TEST_ID)).not.toBeInTheDocument();
      });
    });

    describe('Content State', () => {
      it('should render ContentBody with valid data for entities', () => {
        const items = [createEntityItem()];
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 1 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} type="entities" />);

        expect(screen.getByTestId(CONTENT_BODY_TEST_ID)).toBeInTheDocument();
        expect(screen.queryByTestId(LOADING_BODY_TEST_ID)).not.toBeInTheDocument();
        expect(screen.queryByTestId(EMPTY_BODY_TEST_ID)).not.toBeInTheDocument();
      });

      it('should render ContentBody with valid data for events', () => {
        const items = [createEventItem()];
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 1 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} type="events" />);

        expect(screen.getByTestId(CONTENT_BODY_TEST_ID)).toBeInTheDocument();
      });

      it('should render icon, title, and grouped type in ContentBody', () => {
        const items = [createEntityItem({ icon: 'test-icon', type: 'host' })];
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 1 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} />);

        expect(screen.getByTestId(TOTAL_HITS_TEST_ID)).toBeInTheDocument();
        expect(screen.getByTestId(ICON_TEST_ID)).toBeInTheDocument();
        expect(screen.getByTestId(GROUPED_ITEMS_TYPE_TEST_ID)).toBeInTheDocument();
        // Pagination should not be visible with only 1 item (less than MIN_PAGE_SIZE)
        expect(screen.queryByTestId(PAGE_SIZE_BTN_TEST_ID)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/Page 1/)).not.toBeInTheDocument();
      });

      it('should display correct icon based on entity type', () => {
        const items = [createEntityItem({ icon: 'custom-icon' })];
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 1 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} />);

        expect(screen.getByTestId(ICON_TEST_ID)).toHaveAttribute(
          'data-euiicon-type',
          'custom-icon'
        );
      });

      it('should display correct groupedItemsType label', () => {
        const items = [createEntityItem({ type: 'user' })];
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 1 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} />);

        expect(screen.getByTestId(GROUPED_ITEMS_TYPE_TEST_ID)).toHaveTextContent('Users');
      });
    });
  });

  describe('Pagination Behavior', () => {
    describe('Initial Pagination State', () => {
      it('should start with default pagination pageIndex: 0, pageSize: 10 when totalRecords >= MIN_PAGE_SIZE', () => {
        const items = Array.from({ length: 10 }, (_, i) => createEntityItem({ id: `entity-${i}` }));
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 15 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} />);

        // EUI pagination uses 1-based indexing for display
        expect(screen.getByLabelText(/Page 1/)).toBeInTheDocument();
        expect(screen.getByTestId(PAGE_SIZE_BTN_TEST_ID)).toHaveTextContent('Rows per page: 10');

        // Verify hook was called with initial page params
        expect(mockUseFetchDocumentDetails).toHaveBeenCalledWith(
          expect.objectContaining({
            page: { index: 0, size: 10 },
          })
        );
      });

      it('should hide pagination when totalRecords < MIN_PAGE_SIZE', () => {
        const items = Array.from({ length: 5 }, (_, i) => createEntityItem({ id: `entity-${i}` }));
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 5 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} />);

        // Pagination should not be visible with only 5 total records
        expect(screen.queryByTestId(PAGE_SIZE_BTN_TEST_ID)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/Page 1/)).not.toBeInTheDocument();
      });
    });

    describe('Page Size Changes', () => {
      it('should request new page from server when changing pageSize to 50', async () => {
        const items = Array.from({ length: 10 }, (_, i) => createEntityItem({ id: `entity-${i}` }));
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 50 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} />);

        // Navigate to page 2 first (showing items 11-20)
        await userEvent.click(screen.getByTestId(PAGINATION_BUTTON_NEXT_TEST_ID));

        await waitFor(() => {
          expect(screen.getByLabelText(/Page 2/)).toBeInTheDocument();
        });

        // Verify hook called with page 2
        expect(mockUseFetchDocumentDetails).toHaveBeenCalledWith(
          expect.objectContaining({
            page: { index: 1, size: 10 },
          })
        );

        // Change page size by opening popover and selecting 50
        await userEvent.click(screen.getByTestId(PAGE_SIZE_BTN_TEST_ID));
        // Use pointerEventsCheck: 0 to skip pointer-events check for popover items
        await userEvent.click(screen.getByText('50 rows'), { pointerEventsCheck: 0 });

        await waitFor(() => {
          // Should reset to page 1 (index 0)
          expect(screen.getByLabelText(/Page 1/)).toBeInTheDocument();
          expect(screen.getByTestId(PAGE_SIZE_BTN_TEST_ID)).toHaveTextContent('Rows per page: 50');
        });

        // Verify hook called with new page size and reset pageIndex
        expect(mockUseFetchDocumentDetails).toHaveBeenCalledWith(
          expect.objectContaining({
            page: { index: 0, size: 50 },
          })
        );
      });
    });

    describe('Page Navigation', () => {
      it('should request page 2 from server on navigation', async () => {
        const items = Array.from({ length: 10 }, (_, i) => createEntityItem({ id: `entity-${i}` }));
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 50 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} />);

        expect(screen.getByLabelText(/Page 1/)).toBeInTheDocument();

        await userEvent.click(screen.getByTestId(PAGINATION_BUTTON_NEXT_TEST_ID));

        await waitFor(() => {
          expect(screen.getByLabelText(/Page 2/)).toBeInTheDocument();
          expect(screen.getByTestId(PAGE_SIZE_BTN_TEST_ID)).toHaveTextContent('Rows per page: 10');
        });

        // Verify hook called with page 2 parameters
        expect(mockUseFetchDocumentDetails).toHaveBeenCalledWith(
          expect.objectContaining({
            page: { index: 1, size: 10 },
          })
        );
      });
    });

    describe('Remount Behavior', () => {
      it('should always reset to page 1 (pageIndex: 0) on mount, even with valid pageIndex in localStorage', () => {
        const items = Array.from({ length: 20 }, (_, i) => createEntityItem({ id: `entity-${i}` }));
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 50 } })
        );

        // Simulate localStorage with pageSize=20
        // pageIndex is no longer stored in localStorage, always starts at 0
        localStorage.setItem(
          GROUPED_PREVIEW_PAGINATION_SETTINGS_KEY,
          JSON.stringify({ pageSize: 20 })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} />);

        // Should ALWAYS start at page 1 (pageIndex=0), regardless of localStorage
        expect(screen.getByTestId(CONTENT_BODY_TEST_ID)).toBeInTheDocument();
        expect(screen.getByLabelText(/Page 1/)).toBeInTheDocument();
        expect(screen.getByTestId(PAGE_SIZE_BTN_TEST_ID)).toHaveTextContent('Rows per page: 20');

        // Verify hook called with pageIndex: 0
        expect(mockUseFetchDocumentDetails).toHaveBeenCalledWith(
          expect.objectContaining({
            page: { index: 0, size: 20 },
          })
        );
      });
    });

    describe('Pagination Edge Cases', () => {
      it('should hide pagination when totalRecords less than MIN_PAGE_SIZE (single page)', () => {
        const items = Array.from({ length: 5 }, (_, i) => createEntityItem({ id: `entity-${i}` }));
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 5 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} />);

        // Pagination should be hidden when totalRecords < MIN_PAGE_SIZE
        expect(screen.queryByTestId(PAGE_SIZE_BTN_TEST_ID)).not.toBeInTheDocument();
        expect(screen.getByTestId(TOTAL_HITS_TEST_ID)).toHaveTextContent('5');
      });

      it('should hide pagination when totalRecords equal MIN_PAGE_SIZE (boundary case)', () => {
        const items = Array.from({ length: 10 }, (_, i) => createEntityItem({ id: `entity-${i}` }));
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 10 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} />);

        // Pagination should be hidden when totalRecords === MIN_PAGE_SIZE (all items fit in one page)
        expect(screen.queryByTestId(PAGE_SIZE_BTN_TEST_ID)).not.toBeInTheDocument();
        expect(screen.getByTestId(TOTAL_HITS_TEST_ID)).toHaveTextContent('10');
      });

      it('should show pagination when totalRecords one more than MIN_PAGE_SIZE (2 pages)', () => {
        const items = Array.from({ length: 10 }, (_, i) => createEntityItem({ id: `entity-${i}` }));
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 11 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} />);

        // Pagination should be visible with 11 total records (more than MIN_PAGE_SIZE)
        expect(screen.getByTestId(PAGE_SIZE_BTN_TEST_ID)).toHaveTextContent('Rows per page: 10');
        expect(screen.getByTestId(TOTAL_HITS_TEST_ID)).toHaveTextContent('11');
      });
    });
  });

  describe('Mode-Specific Behavior', () => {
    describe('Entities Type', () => {
      it('should call hook with type entities', () => {
        const items = [createEntityItem()];
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 1 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} type="entities" />);

        expect(mockUseFetchDocumentDetails).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'entities',
            documentIds: defaultProps.documentIds,
            start: defaultProps.start,
            end: defaultProps.end,
            page: { index: 0, size: 10 },
          })
        );
      });

      it('should handle empty array', () => {
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items: [], totalRecords: 0 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} type="entities" documentIds={[]} />);

        expect(screen.getByTestId(EMPTY_BODY_TEST_ID)).toBeInTheDocument();
      });

      it('should use server-side pagination', () => {
        const items = Array.from({ length: 10 }, (_, i) => createEntityItem({ id: `entity-${i}` }));
        const allDocumentIds = Array.from({ length: 25 }, (_, i) => `doc-${i}`);
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 25 } })
        );

        render(
          <GraphGroupedNodePreviewPanel
            {...defaultProps}
            type="entities"
            documentIds={allDocumentIds}
          />
        );

        // Server returns only page 1 items (10), but totalRecords is 25
        expect(screen.getByTestId(PAGE_SIZE_BTN_TEST_ID)).toHaveTextContent('10');
        expect(screen.getByTestId(TOTAL_HITS_TEST_ID)).toHaveTextContent('25');

        // Verify hook called with pagination params
        expect(mockUseFetchDocumentDetails).toHaveBeenCalledWith(
          expect.objectContaining({
            page: { index: 0, size: 10 },
          })
        );
      });

      it('should have total hits equal to totalRecords', () => {
        const items = Array.from({ length: 10 }, (_, i) => createEntityItem({ id: `entity-${i}` }));
        const allDocumentIds = Array.from({ length: 37 }, (_, i) => `doc-${i}`);
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 37 } })
        );

        render(
          <GraphGroupedNodePreviewPanel
            {...defaultProps}
            type="entities"
            documentIds={allDocumentIds}
          />
        );

        expect(screen.getByTestId(TOTAL_HITS_TEST_ID)).toHaveTextContent('37');
      });

      it('should display "Hosts" for host entity type', () => {
        const items = [createEntityItem({ type: 'host' })];
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 1 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} type="entities" />);

        expect(screen.getByTestId(GROUPED_ITEMS_TYPE_TEST_ID)).toHaveTextContent('Hosts');
      });

      it('should display "Users" for user entity type', () => {
        const items = [createEntityItem({ type: 'user' })];
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 1 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} type="entities" />);

        expect(screen.getByTestId(GROUPED_ITEMS_TYPE_TEST_ID)).toHaveTextContent('Users');
      });

      it('should display "Entities" for unknown entity type', () => {
        const items = [createEntityItem({ type: 'unknown' })];
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 1 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} type="entities" />);

        expect(screen.getByTestId(GROUPED_ITEMS_TYPE_TEST_ID)).toHaveTextContent('Entities');
      });

      it('should default to "index" icon when not possible to derive icon from entities', () => {
        // Entity with no icon set (API returns icon: undefined)
        const items = [createEntityItem({ icon: undefined, type: 'unknown' })];
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 1 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} type="entities" />);

        expect(screen.getByTestId(ICON_TEST_ID)).toHaveAttribute('data-euiicon-type', 'index');
      });

      it('should use generic icon and "Entities" label when entities have mixed ECS parent types', () => {
        const items = [
          createEntityItem({ type: 'host', icon: 'storage' }),
          createEntityItem({ type: 'user', icon: 'user' }),
        ];
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 2 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} type="entities" />);

        // Mixed types: should fall back to generic icon and label
        expect(screen.getByTestId(GROUPED_ITEMS_TYPE_TEST_ID)).toHaveTextContent('Entities');
        expect(screen.getByTestId(ICON_TEST_ID)).toHaveAttribute(
          'data-euiicon-type',
          'magnifyWithExclamation'
        );
      });
    });

    describe('Events Type', () => {
      it('should call hook with type events', () => {
        const items = [createEventItem()];
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 1 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} type="events" />);

        expect(mockUseFetchDocumentDetails).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'events',
            documentIds: defaultProps.documentIds,
            start: defaultProps.start,
            end: defaultProps.end,
            page: { index: 0, size: 10 },
          })
        );
      });

      it('should handle empty results', () => {
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items: [], totalRecords: 0 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} type="events" documentIds={[]} />);

        expect(screen.getByTestId(EMPTY_BODY_TEST_ID)).toBeInTheDocument();
      });

      it('should use server-side pagination for events data', () => {
        const items = Array.from({ length: 10 }, (_, i) => createEventItem({ id: `event-${i}` }));
        const allDocumentIds = Array.from({ length: 25 }, (_, i) => `doc-${i}`);
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 25 } })
        );

        render(
          <GraphGroupedNodePreviewPanel
            {...defaultProps}
            type="events"
            documentIds={allDocumentIds}
          />
        );

        // Total hits should be totalRecords from server, not items.length
        expect(screen.getByTestId(TOTAL_HITS_TEST_ID)).toHaveTextContent('25');
        expect(screen.getByTestId(PAGE_SIZE_BTN_TEST_ID)).toHaveTextContent('10');
      });

      it('should display "Events" for events groupedItemsType', () => {
        const items = [createEventItem()];
        mockUseFetchDocumentDetails.mockReturnValue(
          createMockHookResult({ data: { items, totalRecords: 1 } })
        );

        render(<GraphGroupedNodePreviewPanel {...defaultProps} type="events" />);

        expect(screen.getByTestId(GROUPED_ITEMS_TYPE_TEST_ID)).toHaveTextContent('Events');
      });
    });
  });

  describe('Hook Integration', () => {
    it('should pass correct parameters to useFetchDocumentDetails hook', () => {
      const items = [createEntityItem()];
      mockUseFetchDocumentDetails.mockReturnValue(
        createMockHookResult({ data: { items, totalRecords: 1 } })
      );

      const customProps = {
        ...defaultProps,
        type: 'entities' as const,
        documentIds: ['id-1', 'id-2'],
        start: '2024-06-01T00:00:00.000Z',
        end: '2024-06-02T00:00:00.000Z',
      };

      render(<GraphGroupedNodePreviewPanel {...customProps} />);

      expect(mockUseFetchDocumentDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'entities',
          documentIds: ['id-1', 'id-2'],
          start: '2024-06-01T00:00:00.000Z',
          end: '2024-06-02T00:00:00.000Z',
          page: { index: 0, size: 10 },
          options: expect.objectContaining({
            enabled: true,
          }),
        })
      );
    });

    it('should disable hook when documentIds is empty', () => {
      render(<GraphGroupedNodePreviewPanel {...defaultProps} type="entities" documentIds={[]} />);

      expect(mockUseFetchDocumentDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({ enabled: false }),
        })
      );
    });

    it('should call refresh on refresh button click', async () => {
      const mockRefresh = jest.fn();
      mockUseFetchDocumentDetails.mockReturnValue(
        createMockHookResult({
          data: { items: [], totalRecords: 0 },
          refresh: mockRefresh,
        })
      );

      render(<GraphGroupedNodePreviewPanel {...defaultProps} type="entities" />);

      // Empty state shows a refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should render empty state when data has empty items and isError is true', () => {
      mockUseFetchDocumentDetails.mockReturnValue(
        createMockHookResult({
          isError: true,
          error: new Error('API Error'),
          data: { items: [], totalRecords: 0 },
        })
      );

      render(<GraphGroupedNodePreviewPanel {...defaultProps} />);

      // Shows empty state, not an error UI (error is handled via toast)
      expect(screen.getByTestId(EMPTY_BODY_TEST_ID)).toBeInTheDocument();
    });
  });

  describe('Performance Testing', () => {
    it('should handle 100+ totalRecords with server-side pagination', () => {
      const items = Array.from({ length: 10 }, (_, i) => createEntityItem({ id: `entity-${i}` }));
      const allDocumentIds = Array.from({ length: 150 }, (_, i) => `doc-${i}`);
      mockUseFetchDocumentDetails.mockReturnValue(
        createMockHookResult({ data: { items, totalRecords: 150 } })
      );

      render(
        <GraphGroupedNodePreviewPanel
          {...defaultProps}
          type="entities"
          documentIds={allDocumentIds}
        />
      );

      // Should not crash, should show first page with server-paginated data
      expect(screen.getByTestId(CONTENT_BODY_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId(TOTAL_HITS_TEST_ID)).toHaveTextContent('150');
      expect(screen.getByTestId(PAGE_SIZE_BTN_TEST_ID)).toHaveTextContent('Rows per page: 10');

      // Verify only 10 items returned from server for page 1
      expect(mockUseFetchDocumentDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          page: { index: 0, size: 10 },
        })
      );
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import {
  EMPTY_EVENTS_TABLE_FOR_CASES_ID,
  EventsTableForCases,
  LOADING_EVENTS_TABLE_FOR_CASES_ID,
} from './table';
import { TestProviders } from '../../../common/mock';
import { useCaseEventsDataView } from './use_events_data_view';

import { DataView } from '@kbn/data-views-plugin/public';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { searchEvents } from './search_events';
/**
 * ## IMPORTANT TODO ##
 * This file imports @elastic/ecs directly, which imports all ECS fields into the bundle.
 * This should be migrated to using the unified fields metadata plugin instead.
 * See https://github.com/elastic/kibana/tree/main/x-pack/platform/plugins/shared/fields_metadata for more details.
 */
// eslint-disable-next-line no-restricted-imports
import { EcsFlat } from '@elastic/ecs';
import type { EcsSecurityExtension } from '@kbn/securitysolution-ecs';

jest.mock('./use_events_data_view');
jest.mock('./search_events');

describe('EventsTableForCases', () => {
  beforeEach(() => {
    jest.mocked(useCaseEventsDataView).mockReturnValue({
      dataView: new DataView({
        fieldFormats: fieldFormatsMock,
      }),
      status: 'ready',
    });

    jest.mocked(searchEvents).mockResolvedValue([
      {
        _id: 'mock-id',
        data: [
          {
            field: '_id',
            value: ['mock-id'],
          },
          {
            field: '@timestamp',
            value: ['2025-09-16 16:15'],
          },
        ],
        ecs: { ...EcsFlat, _id: 'mock-id', index: 'mock-index' } as unknown as EcsSecurityExtension,
      },
    ]);
  });

  it('renders the table', async () => {
    render(
      <EventsTableForCases
        events={[
          {
            eventId: '1',
            index: 'test-index',
          },
        ]}
      />,
      { wrapper: TestProviders }
    );

    // renders loading initially
    expect(screen.getByTestId(LOADING_EVENTS_TABLE_FOR_CASES_ID)).toBeInTheDocument();

    // Check if value cells are displayed at all
    await waitFor(() => {
      expect(screen.getByTestId('body-data-grid')).toBeInTheDocument();

      const cells = screen.getAllByTestId('dataGridRowCell');

      expect(cells.length).toBeGreaterThan(2);
    });
  });

  it('renders empty state for no events', async () => {
    jest.mocked(searchEvents).mockResolvedValue([]);
    render(<EventsTableForCases events={[]} />, { wrapper: TestProviders });

    await waitFor(() => {
      expect(screen.getByTestId(EMPTY_EVENTS_TABLE_FOR_CASES_ID)).toBeInTheDocument();
    });
  });

  it('applies the pagination correctly', async () => {
    const newLocal = new Array(100).fill(0).map((_, index) => ({
      eventId: `event-${index}`,
      index: 'test-index',
    }));

    render(<EventsTableForCases events={newLocal} />, { wrapper: TestProviders });

    await waitFor(() => {
      // should have 4 pages (default is 25 per page, we are pulling in data for 100 events)
      expect(screen.getByTestId('pagination-button-0')).toBeInTheDocument();
      expect(screen.getByTestId('pagination-button-3')).toBeInTheDocument();
    });

    // test if the endpoint is called with proper pagination parameters
    await act(() => {
      screen.getByTestId('pagination-button-3').click();
    });

    expect(jest.mocked(searchEvents)).toHaveBeenCalled();
    expect(jest.mocked(searchEvents)).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(DataView),
      expect.objectContaining({ pageIndex: 3, itemsPerPage: 25 })
    );
  });

  it('calls the search events function', () => {
    render(
      <EventsTableForCases
        events={[
          {
            eventId: 'mock-event-id',
            index: 'test-index',
          },
        ]}
      />,
      { wrapper: TestProviders }
    );

    expect(jest.mocked(searchEvents)).toHaveBeenCalled();
    expect(jest.mocked(searchEvents)).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(DataView),
      expect.objectContaining({ eventIds: expect.arrayContaining(['mock-event-id']) })
    );
  });
});

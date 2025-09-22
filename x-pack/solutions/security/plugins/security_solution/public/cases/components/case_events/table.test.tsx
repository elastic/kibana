/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EventsTableForCases } from './table';
import { TestProviders } from '../../../common/mock';
import { useCaseEventsDataView } from './use_events_data_view';

import { DataView } from '@kbn/data-views-plugin/public';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { searchEvents } from './search_events';
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

  it('renders the table', () => {
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

    expect(screen.getByTestId('body-data-grid')).toBeInTheDocument();
  });
});

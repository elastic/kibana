/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, renderHook } from '@testing-library/react';
import { useLeadingControlColumns } from './use_leading_control_columns';
import type { RowControlColumn } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';

const mockGetEuidFilterBasedOnDocument = jest.fn();
const mockUseEntityStoreEuidApi = jest.fn();

jest.mock('@kbn/entity-store/public', () => ({
  useEntityStoreEuidApi: (...args: unknown[]) => mockUseEntityStoreEuidApi(...args),
  ENTITY_STORE_ROUTES: { public: { RESOLUTION_GROUP: '/mock/resolution/group' } },
}));

const mockRecord: DataTableRecord = {
  id: '1',
  raw: {
    _index: 'test',
    _id: '1',
    _source: {
      entity: {
        id: 'test-entity-id',
        name: 'john.doe',
        EngineMetadata: { Type: 'user' },
      },
    },
  },
  flattened: {
    'entity.name': 'john.doe',
    'entity.EngineMetadata.Type': 'user',
  },
};

const MockControl: React.FC<{
  onClick?: () => void;
  disabled?: boolean;
  iconType?: string;
  label?: string;
  color?: string;
  'data-test-subj'?: string;
}> = ({ onClick, disabled }) => (
  <button type="button" onClick={onClick} disabled={disabled} data-test-subj="control-button">
    {'Control'}
  </button>
);

const renderTimelineControl = (column: RowControlColumn, record: DataTableRecord = mockRecord) => {
  const rendered = (column.render as Function)(MockControl, { record });
  return render(rendered);
};

describe('useLeadingControlColumns', () => {
  const defaultArgs = {
    canUseTimeline: false,
    investigateInTimeline: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEntityStoreEuidApi.mockReturnValue({
      euid: { kql: { getEuidFilterBasedOnDocument: mockGetEuidFilterBasedOnDocument } },
    });
    mockGetEuidFilterBasedOnDocument.mockReturnValue(undefined);
  });

  it('returns no timeline action when canUseTimeline is false', () => {
    const { result } = renderHook(() => useLeadingControlColumns(defaultArgs));
    expect(result.current.find((c) => c.id === 'entity-analytics-timeline-action')).toBeUndefined();
  });

  it('returns timeline action when canUseTimeline is true', () => {
    const { result } = renderHook(() =>
      useLeadingControlColumns({ ...defaultArgs, canUseTimeline: true })
    );
    expect(result.current.find((c) => c.id === 'entity-analytics-timeline-action')).toBeDefined();
  });

  describe('timeline action onClick', () => {
    const investigateInTimeline = jest.fn();

    it('calls investigateInTimeline with KQL query when euidApi returns a filter', () => {
      mockGetEuidFilterBasedOnDocument.mockReturnValue('user.name: "john.doe"');

      const { result } = renderHook(() =>
        useLeadingControlColumns({ canUseTimeline: true, investigateInTimeline })
      );

      const column = result.current.find((c) => c.id === 'entity-analytics-timeline-action')!;
      const { getByTestId } = renderTimelineControl(column);
      fireEvent.click(getByTestId('control-button'));

      expect(mockGetEuidFilterBasedOnDocument).toHaveBeenCalledWith('user', mockRecord.raw);
      expect(investigateInTimeline).toHaveBeenCalledWith({
        query: { query: 'user.name: "john.doe"', language: 'kuery' },
      });
    });

    it('falls back to dataProviders when euidApi returns undefined', () => {
      mockGetEuidFilterBasedOnDocument.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useLeadingControlColumns({ canUseTimeline: true, investigateInTimeline })
      );

      const column = result.current.find((c) => c.id === 'entity-analytics-timeline-action')!;
      const { getByTestId } = renderTimelineControl(column);
      fireEvent.click(getByTestId('control-button'));

      expect(investigateInTimeline).toHaveBeenCalledWith({
        dataProviders: expect.any(Array),
      });
    });

    it('falls back to dataProviders when euidApi is null', () => {
      mockUseEntityStoreEuidApi.mockReturnValue(null);

      const { result } = renderHook(() =>
        useLeadingControlColumns({ canUseTimeline: true, investigateInTimeline })
      );

      const column = result.current.find((c) => c.id === 'entity-analytics-timeline-action')!;
      const { getByTestId } = renderTimelineControl(column);
      fireEvent.click(getByTestId('control-button'));

      expect(investigateInTimeline).toHaveBeenCalledWith({
        dataProviders: expect.any(Array),
      });
    });

    it('renders disabled control when entity fields are missing', () => {
      const emptyRecord: DataTableRecord = {
        id: '2',
        raw: { _index: 'test', _id: '2', _source: {} },
        flattened: {},
      };

      const { result } = renderHook(() =>
        useLeadingControlColumns({ canUseTimeline: true, investigateInTimeline })
      );

      const column = result.current.find((c) => c.id === 'entity-analytics-timeline-action')!;
      const { getByTestId } = renderTimelineControl(column, emptyRecord);

      expect(getByTestId('control-button')).toBeDisabled();
    });
  });
});

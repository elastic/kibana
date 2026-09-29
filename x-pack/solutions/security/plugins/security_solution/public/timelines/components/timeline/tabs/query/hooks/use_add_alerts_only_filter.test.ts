/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useAddAlertsOnlyFilter } from './use_add_alerts_only_filter';
import { useDataView } from '../../../../../../data_view_manager/hooks/use_data_view';
import { useKibana } from '../../../../../../common/lib/kibana';
import { useDispatch } from 'react-redux-v7';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { useSpaceId } from '../../../../../../common/hooks/use_space_id';

vi.mock('../../../../../../data_view_manager/hooks/use_data_view');
vi.mock('../../../../../../common/lib/kibana');
vi.mock('react-redux-v7');
vi.mock('../../../../../../common/hooks/use_space_id');

const dataView: DataView = createStubDataView({
  spec: { title: '.alerts-security.alerts-default' },
});

describe('useAddAlertsOnlyFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should dispatch action and add filters', () => {
    const dispatch = vi.fn();
    (useDispatch as Mock).mockReturnValue(dispatch);

    const addFilters = vi.fn();
    (useKibana as Mock).mockReturnValue({
      services: {
        timelineDataService: {
          query: {
            filterManager: {
              addFilters,
              getAppFilters: vi.fn(),
            },
          },
        },
        application: {
          capabilities: {},
        },
      },
    });

    (useSpaceId as Mock).mockReturnValue('default');
    (useDataView as Mock).mockReturnValue({ dataView: { ...dataView, id: ' id' } });

    const { result } = renderHook(() => useAddAlertsOnlyFilter({ timelineId: 'test-timeline' }));

    result.current();

    expect(addFilters).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalled();
  });

  it('should not do anything if dataview is not defined', () => {
    const dispatch = vi.fn();
    (useDispatch as Mock).mockReturnValue(dispatch);

    const addFilters = vi.fn();
    (useKibana as Mock).mockReturnValue({
      services: {
        timelineDataService: {
          query: {
            filterManager: {
              addFilters,
            },
          },
        },
        application: {
          capabilities: {},
        },
      },
    });

    (useSpaceId as Mock).mockReturnValue('default');
    (useDataView as Mock).mockReturnValue({ dataView: undefined });

    const { result } = renderHook(() => useAddAlertsOnlyFilter({ timelineId: 'test-timeline' }));

    result.current();

    expect(addFilters).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should not do anything if filterManager is not defined', () => {
    const dispatch = vi.fn();
    (useDispatch as Mock).mockReturnValue(dispatch);

    (useKibana as Mock).mockReturnValue({
      services: {
        timelineDataService: {
          query: {
            filterManager: undefined,
          },
        },
        application: {
          capabilities: {},
        },
      },
    });

    (useSpaceId as Mock).mockReturnValue('default');
    (useDataView as Mock).mockReturnValue({ dataView: { ...dataView, id: ' id' } });

    const { result } = renderHook(() => useAddAlertsOnlyFilter({ timelineId: 'test-timeline' }));

    result.current();

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should not do anything if spaceId is not defined', () => {
    const addFilters = vi.fn();
    (useKibana as Mock).mockReturnValue({
      services: {
        timelineDataService: {
          query: {
            filterManager: addFilters,
          },
        },
        application: {
          capabilities: {},
        },
      },
    });

    (useSpaceId as Mock).mockReturnValue(undefined);
    (useDataView as Mock).mockReturnValue({ dataView: { ...dataView, id: ' id' } });

    const { result } = renderHook(() => useAddAlertsOnlyFilter({ timelineId: 'test-timeline' }));

    result.current();

    expect(addFilters).not.toHaveBeenCalled();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { wrapper } from '../../mocks';

import { useLensAttributes } from '../../use_lens_attributes';

import { kpiUniqueIpsDestinationMetricLensAttributes } from './kpi_unique_ips_destination_metric';
import { getMockDataViewWithMatchedIndices } from '../../../../../data_view_manager/mocks/mock_data_view';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';

vi.mock('../../../../utils/route/use_route_spy', () => {
  const mocked = {
    useRouteSpy: vi.fn().mockReturnValue([
      {
        detailName: 'mockHost',
        pageName: 'hosts',
        tabName: 'events',
      },
    ]),
  };
  return { ...mocked, default: mocked };
});

describe('kpiUniqueIpsDestinationMetricLensAttributes', () => {
  beforeAll(() => {
    const dataView = getMockDataViewWithMatchedIndices(['auditbeat-mytest-*']);
    dataView.id = 'security-solution-my-test';

    vi.mocked(useDataView).mockReturnValue({
      dataView,
      status: 'ready',
    });
  });

  it('should render', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          lensAttributes: kpiUniqueIpsDestinationMetricLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });
});

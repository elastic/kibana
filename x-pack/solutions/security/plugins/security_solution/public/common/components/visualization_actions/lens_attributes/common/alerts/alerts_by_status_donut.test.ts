/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { mockExtraFilter, wrapper } from '../../../mocks';

import { useLensAttributes } from '../../../use_lens_attributes';

import { getAlertsByStatusAttributes } from './alerts_by_status_donut';
import { useDataView } from '../../../../../../data_view_manager/hooks/use_data_view';
import { withIndices } from '../../../../../../data_view_manager/hooks/__mocks__/use_data_view';

vi.mock('uuid', () => {
  const mocked = {
    v4: vi.fn().mockReturnValue('generated-uuid'),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../utils/route/use_route_spy', () => {
  const mocked = {
    useRouteSpy: vi.fn().mockReturnValue([
      {
        pageName: 'alerts',
      },
    ]),
  };
  return { ...mocked, default: mocked };
});

describe('getAlertsByStatusAttributes', () => {
  beforeAll(() => {
    vi.mocked(useDataView).mockReturnValue(
      withIndices(['signal-index'], 'security-solution-my-test')
    );
  });

  it('should render without extra options', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getAlertsByStatusAttributes,
          stackByField: 'kibana.alert.workflow_status',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });

  it('should render with extra options - filters', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          extraOptions: {
            filters: mockExtraFilter,
          },
          getLensAttributes: getAlertsByStatusAttributes,
          stackByField: 'kibana.alert.workflow_status',
        }),
      { wrapper }
    );

    expect(result?.current?.state.filters).toEqual(expect.arrayContaining(mockExtraFilter));
  });
});

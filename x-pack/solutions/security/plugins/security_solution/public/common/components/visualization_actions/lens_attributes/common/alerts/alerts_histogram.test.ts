/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { wrapper } from '../../../mocks';

import { useLensAttributes } from '../../../use_lens_attributes';

import { getAlertsHistogramLensAttributes } from './alerts_histogram';
import { useDataView } from '../../../../../../data_view_manager/hooks/use_data_view';
import { withIndices } from '../../../../../../data_view_manager/hooks/__mocks__/use_data_view';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('generated-uuid'),
}));

jest.mock('../../../../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      detailName: 'mockRule',
      pageName: 'rules',
      tabName: 'alerts',
    },
  ]),
}));

describe('getAlertsHistogramLensAttributes', () => {
  beforeAll(() => {
    jest
      .mocked(useDataView)
      .mockReturnValue(withIndices(['signal-index'], 'security-solution-my-test'));
  });

  it('should render without extra options', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getAlertsHistogramLensAttributes,
          stackByField: 'event.category',
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
            filters: [
              {
                meta: {
                  type: 'phrases',
                  key: '_index',
                  params: ['.alerts-security.alerts-default'],
                  alias: null,
                  negate: false,
                  disabled: false,
                },
                query: {
                  bool: {
                    should: [
                      {
                        match_phrase: {
                          _index: '.alerts-security.alerts-default',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              },
            ],
          },
          getLensAttributes: getAlertsHistogramLensAttributes,
          stackByField: 'event.category',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });
});

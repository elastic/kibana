/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { renderHook } from '@testing-library/react';
import { wrapper } from '../../mocks';

import { useLensAttributes } from '../../use_lens_attributes';

import { getAuthenticationLensAttributes } from './authentication';
import { getMockDataViewWithMatchedIndices } from '../../../../../data_view_manager/mocks/mock_data_view';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('generated-uuid'),
}));

jest.mock('../../../../../sourcerer/containers', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({
    selectedPatterns: ['auditbeat-mytest-*'],
    dataViewId: 'security-solution-my-test',
    indicesExist: true,
    sourcererDataView: {},
  }),
}));

jest.mock('../../../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      detailName: 'mockHost',
      pageName: 'hosts',
      tabName: 'events',
    },
  ]),
}));

const mockEuiTheme = {
  colors: {
    vis: {
      euiColorVis0: '#000',
      euiColorVis7: '#111',
    },
  },
} as unknown as EuiThemeComputed;

describe('getAuthenticationLensAttributes', () => {
  beforeAll(() => {
    const dataView = getMockDataViewWithMatchedIndices(['auditbeat-mytest-*']);
    dataView.id = 'security-solution-my-test';

    jest.mocked(useDataView).mockReturnValue({
      dataView,
      status: 'ready',
    });
  });

  it('should render', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getAuthenticationLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });

  it('merges extraOptions.filters after the authentication category filter (host details identity scope)', () => {
    const identityScopeFilter = {
      query: { bool: { must: [{ term: { 'host.entity.id': 'host-entity-1' } }] } },
      meta: {},
    };
    const attrs = getAuthenticationLensAttributes({
      euiTheme: mockEuiTheme,
      extraOptions: { filters: [identityScopeFilter] },
    });

    expect(attrs.state.filters).toHaveLength(2);
    expect(attrs.state.filters[1]).toEqual(identityScopeFilter);
  });
});

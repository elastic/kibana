/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { wrapper } from '../../mocks';

import { useLensAttributes } from '../../use_lens_attributes';

import { kpiUserAuthenticationsMetricSuccessLensAttributes } from './kpi_user_authentications_metric_success';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';
import { withIndices } from '../../../../../data_view_manager/hooks/__mocks__/use_data_view';

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
      detailName: 'elastic',
      pageName: 'users',
      tabName: 'events',
    },
  ]),
}));

describe('kpiUserAuthenticationsMetricSuccessLensAttributes', () => {
  beforeAll(() => {
    jest
      .mocked(useDataView)
      .mockReturnValue(withIndices(['auditbeat-mytest-*'], 'security-solution-my-test'));
  });

  it('should render', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          lensAttributes: kpiUserAuthenticationsMetricSuccessLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });
});

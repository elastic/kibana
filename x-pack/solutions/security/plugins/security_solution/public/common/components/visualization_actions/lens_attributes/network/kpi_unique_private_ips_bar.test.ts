/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { wrapper } from '../../mocks';

import { useLensAttributes } from '../../use_lens_attributes';

import { getKpiUniquePrivateIpsBarLensAttributes } from './kpi_unique_private_ips_bar';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';
import { withIndices } from '../../../../../data_view_manager/hooks/__mocks__/use_data_view';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('generated-uuid'),
}));

jest.mock('../../../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      detailName: '192.168.1.1',
      pageName: 'network',
      tabName: 'events',
    },
  ]),
}));

describe('getKpiUniquePrivateIpsBarLensAttributes', () => {
  beforeAll(() => {
    jest
      .mocked(useDataView)
      .mockReturnValue(withIndices(['auditbeat-mytest-*'], 'security-solution-my-test'));
  });

  it('should render', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getKpiUniquePrivateIpsBarLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });
});

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

jest.mock('uuid', () => ({
  v4: jest
    .fn()
    .mockReturnValueOnce('5acd4c9d-dc3b-4b21-9632-e4407944c36d')
    .mockReturnValueOnce('d9c438c5-f776-4436-9d20-d62dc8c03be8')
    .mockReturnValueOnce('d27e0966-daf9-41f4-9033-230cf1e76dc9')
    .mockReturnValueOnce('4607c585-3af3-43b9-804f-e49b27796d79')
    .mockReturnValueOnce('e406bf4f-942b-41ac-b516-edb5cef06ec8')
    .mockReturnValueOnce('38aa6532-6bf9-4c8f-b2a6-da8d32f7d0d7'),
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
      detailName: '192.168.1.1',
      pageName: 'network',
      tabName: 'events',
    },
  ]),
}));

describe('getKpiUniquePrivateIpsBarLensAttributes', () => {
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

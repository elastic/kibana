/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { wrapper } from '../../mocks';

import { useLensAttributes } from '../../use_lens_attributes';

import { getKpiUserAuthenticationsBarLensAttributes } from './kpi_user_authentications_bar';

jest.mock('uuid', () => ({
  v4: jest
    .fn()
    .mockReturnValueOnce('c8165fc3-7180-4f1b-8c87-bc3ea04c6df7')
    .mockReturnValueOnce('e959c351-a3a2-4525-b244-9623f215a8fd')
    .mockReturnValueOnce('938b445a-a291-4bbc-84fe-4f47b69c20e4')
    .mockReturnValueOnce('430e690c-9992-414f-9bce-00812d99a5e7')
    .mockReturnValueOnce('b9acd453-f476-4467-ad38-203e37b73e55')
    .mockReturnValueOnce('31213ae3-905b-4e88-b987-0cccb1f3209f'),
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
      detailName: 'elastic',
      pageName: 'users',
      tabName: 'events',
    },
  ]),
}));

describe('getKpiUserAuthenticationsBarLensAttributes', () => {
  it('should render', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getKpiUserAuthenticationsBarLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });
});

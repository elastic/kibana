/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { wrapper } from '../../mocks';

import { useLensAttributes } from '../../use_lens_attributes';

import { getKpiUserAuthenticationsAreaLensAttributes } from './kpi_user_authentications_area';

jest.mock('uuid', () => ({
  v4: jest
    .fn()
    .mockReturnValueOnce('2b27c80e-a20d-46f1-8fb2-79626ef4563c')
    .mockReturnValueOnce('33a6163d-0c0a-451d-aa38-8ca6010dd5bf')
    .mockReturnValueOnce('0eb97c09-a351-4280-97da-944e4bd30dd7')
    .mockReturnValueOnce('49a42fe6-ebe8-4adb-8eed-1966a5297b7e')
    .mockReturnValueOnce('4590dafb-4ac7-45aa-8641-47a3ff0b817c')
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

describe('getKpiUserAuthenticationsAreaLensAttributes', () => {
  it('should render', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getKpiUserAuthenticationsAreaLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });
});

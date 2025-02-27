/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { wrapper } from '../../mocks';

import { useLensAttributes } from '../../use_lens_attributes';

import { getAuthenticationLensAttributes } from './authentication';

jest.mock('uuid', () => ({
  v4: jest
    .fn()
    .mockReturnValueOnce('3fd0c5d5-f762-4a27-8c56-14eee0223e13')
    .mockReturnValueOnce('bef502be-e5ff-442f-9e3e-229f86ca2afa')
    .mockReturnValueOnce('cded27f7-8ef8-458c-8d9b-70db48ae340d')
    .mockReturnValueOnce('a3bf9dc1-c8d2-42d6-9e60-31892a4c509e')
    .mockReturnValueOnce('b41a2958-650b-470a-84c4-c6fd8f0c6d37')
    .mockReturnValueOnce('5417777d-d9d9-4268-9cdc-eb29b873bd65'),
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

describe('getAuthenticationLensAttributes', () => {
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
});

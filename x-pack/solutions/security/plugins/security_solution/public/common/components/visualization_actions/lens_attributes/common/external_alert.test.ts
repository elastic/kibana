/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { wrapper } from '../../mocks';

import { useLensAttributes } from '../../use_lens_attributes';

import { getExternalAlertLensAttributes } from './external_alert';

jest.mock('uuid', () => ({
  v4: jest
    .fn()
    .mockReturnValueOnce('a3c54471-615f-4ff9-9fda-69b5b2ea3eef')
    .mockReturnValueOnce('37bdf546-3c11-4b08-8c5d-e37debc44f1d')
    .mockReturnValueOnce('0a923af2-c880-4aa3-aa93-a0b9c2801f6d')
    .mockReturnValueOnce('42334c6e-98d9-47a2-b4cb-a445abb44c93'),
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

describe('getExternalAlertLensAttributes', () => {
  it('should render', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });

  it('should render values in legend', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state?.visualization).toEqual(
      expect.objectContaining({
        legend: expect.objectContaining({ legendStats: ['currentAndLastValue'] }),
      })
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { XYState } from '@kbn/lens-plugin/public';

import { getRiskScoreOverTimeAreaAttributes } from './risk_score_over_time_area';
import { useLensAttributes } from '../../common/components/visualization_actions/use_lens_attributes';
import { wrapper } from '../../common/components/visualization_actions/mocks';

jest.mock('../../sourcerer/containers', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({
    selectedPatterns: ['auditbeat-mytest-*'],
    dataViewId: 'security-solution-my-test',
    indicesExist: true,
  }),
}));

jest.mock('../../common/utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      detailName: 'mockHost',
      pageName: 'hosts',
      tabName: 'hostRisk',
    },
  ]),
}));

jest.mock('uuid', () => ({
  v4: jest
    .fn()
    .mockReturnValueOnce('d594baeb-5eca-480c-8885-ba79eaf41372')
    .mockReturnValueOnce('c604baeb-5eca-480c-8885-ba79eaf41372')
    .mockReturnValueOnce('e614baeb-5eca-480c-8885-ba79eaf41372')
    .mockReturnValueOnce('f614baeb-5eca-480c-8885-ba79eaf52483')
    .mockReturnValue('1dd5663b-f062-43f8-8688-fc8166c2ca8e'),
}));

describe('getRiskScoreOverTimeAreaAttributes', () => {
  it('should render', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getRiskScoreOverTimeAreaAttributes,
          stackByField: 'host',
          extraOptions: {
            spaceId: 'mockSpaceId',
          },
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });

  it('should render a Reference Line with an Alert icon', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getRiskScoreOverTimeAreaAttributes,
          stackByField: 'host',
          extraOptions: {
            spaceId: 'mockSpaceId',
          },
        }),
      { wrapper }
    );

    expect(
      (result?.current?.state.visualization as XYState).layers.find(
        (layer) => layer.layerType === 'referenceLine'
      )
    ).toEqual(
      expect.objectContaining({
        layerId: '1dd5663b-f062-43f8-8688-fc8166c2ca8e',
        layerType: 'referenceLine',
        accessors: ['1dd5663b-f062-43f8-8688-fc8166c2ca8e'],
        yConfig: [
          {
            forAccessor: '1dd5663b-f062-43f8-8688-fc8166c2ca8e',
            axisMode: 'left',
            lineWidth: 2,
            color: '#aa6556',
            icon: 'alert',
            textVisibility: true,
            fill: 'none',
            iconPosition: 'left',
          },
        ],
      })
    );
  });
});

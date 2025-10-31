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
  v4: jest.fn().mockReturnValue('generated-uuid'),
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
        layerId: 'layer-id2-generated-uuid',
        layerType: 'referenceLine',
        accessors: ['layer2-column-id-generated-uuid'],
        yConfig: [
          {
            forAccessor: 'layer2-column-id-generated-uuid',
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

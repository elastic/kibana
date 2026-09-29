/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { wrapper } from '../../common/components/visualization_actions/mocks';
import { useLensAttributes } from '../../common/components/visualization_actions/use_lens_attributes';

import { getRiskScoreDonutAttributes } from './risk_score_donut';

vi.mock('../../common/utils/route/use_route_spy', () => {
  const mocked = {
    useRouteSpy: vi.fn().mockReturnValue([
      {
        detailName: 'undefined',
        pageName: 'overview',
        tabName: undefined,
      },
    ]),
  };
  return { ...mocked, default: mocked };
});

vi.mock('uuid', () => {
  const mocked = {
    v4: vi.fn().mockReturnValue('generated-uuid'),
  };
  return { ...mocked, default: mocked };
});

describe('getRiskScoreDonutAttributes', () => {
  it('should render', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getRiskScoreDonutAttributes,
          stackByField: 'host',
          extraOptions: {
            spaceId: 'mockSpaceId',
          },
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });
});

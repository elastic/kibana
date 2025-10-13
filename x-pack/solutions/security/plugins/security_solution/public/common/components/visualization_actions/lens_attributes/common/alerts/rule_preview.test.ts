/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { mockRulePreviewFilter, wrapper } from '../../../mocks';

import { useLensAttributes } from '../../../use_lens_attributes';

import { getRulePreviewLensAttributes } from './rule_preview';
const mockInternalReferenceId = 'internal-reference-id-generated-uuid';
const mockRuleId = 'rule-id-generated-uuid';

jest.mock('uuid', () => ({
  ...jest.requireActual('uuid'),
  v4: jest.fn().mockReturnValue('generated-uuid'),
}));

jest.mock('../../../../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      pageName: 'alerts',
    },
  ]),
}));

describe('getRulePreviewLensAttributes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render without extra options', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          extraOptions: { showLegend: false },
          getLensAttributes: getRulePreviewLensAttributes,
          stackByField: 'event.category',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });

  it('should render with extra options - filters', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          extraOptions: {
            ruleId: mockRuleId,
          },
          getLensAttributes: getRulePreviewLensAttributes,
          stackByField: 'event.category',
        }),
      { wrapper }
    );

    expect(result?.current?.state.filters).toEqual(
      expect.arrayContaining(mockRulePreviewFilter(mockInternalReferenceId, mockRuleId))
    );
  });
});

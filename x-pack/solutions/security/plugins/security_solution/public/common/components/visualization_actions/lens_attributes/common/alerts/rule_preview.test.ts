/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { mockRulePreviewFilter, wrapper } from '../../../mocks';

import { useLensAttributes } from '../../../use_lens_attributes';

import { getRulePreviewLensAttributes } from './rule_preview';
const mockInternalReferenceId = 'internal-reference-id-generated-uuid';
const mockRuleId = 'rule-id-generated-uuid';

vi.mock('uuid', () => {
  const mocked = {
    ...require('uuid'),
    v4: vi.fn().mockReturnValue('generated-uuid'),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../utils/route/use_route_spy', () => {
  const mocked = {
    useRouteSpy: vi.fn().mockReturnValue([
      {
        pageName: 'alerts',
      },
    ]),
  };
  return { ...mocked, default: mocked };
});

describe('getRulePreviewLensAttributes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

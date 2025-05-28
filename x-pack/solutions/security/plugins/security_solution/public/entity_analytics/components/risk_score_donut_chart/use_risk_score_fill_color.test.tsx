/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useRiskScoreFillColor } from './use_risk_score_fill_color';
import { emptyDonutColor } from '../../../common/components/charts/donutchart_empty';
import { SEVERITY_UI_SORT_ORDER } from '../../common';
import { TestProviders } from '../../../common/mock';

describe('useRiskScoreFillColor', () => {
  it('returns the correct color for a valid risk severity', () => {
    const { result } = renderHook(() => useRiskScoreFillColor(), { wrapper: TestProviders });

    const colors = SEVERITY_UI_SORT_ORDER.map((severity) => result.current(severity));

    expect(colors).toMatchInlineSnapshot(`
      Array [
        "#aaa",
        "#54B399",
        "#D6BF57",
        "#DA8B45",
        "#E7664C",
      ]
    `);
  });

  it('returns the empty donut color for an invalid risk severity', () => {
    const { result } = renderHook(() => useRiskScoreFillColor(), { wrapper: TestProviders });

    const color = result.current('invalid_severity');
    expect(color).toBe(emptyDonutColor);
  });
});

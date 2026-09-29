/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { render } from '../../../utils/testing';
import { StepMetrics } from './step_metrics';
import { useStepMetrics } from '../hooks/use_step_metrics';
import { useStepPrevMetrics } from '../hooks/use_step_prev_metrics';

vi.mock('../hooks/use_step_metrics', () => {
  const mocked = {
    useStepMetrics: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_step_prev_metrics', () => {
  const mocked = {
    useStepPrevMetrics: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockUseStepMetrics = useStepMetrics as MockedFunction<typeof useStepMetrics>;
const mockUseStepPrevMetrics = useStepPrevMetrics as MockedFunction<typeof useStepPrevMetrics>;

describe('StepMetrics', () => {
  beforeEach(() => {
    mockUseStepPrevMetrics.mockReturnValue({ metrics: [], loading: false });
    mockUseStepMetrics.mockReturnValue({
      metrics: [
        {
          label: 'Transfer size',
          value: 558 * 1024,
          formatted: '558 KB',
          dataTestSubj: 'synth-step-metric-transfer-size',
        },
        {
          label: 'FCP',
          value: 402_000,
          formatted: '402 ms',
          dataTestSubj: 'synth-step-metric-fcp',
        },
        {
          label: 'LCP',
          value: 521_000,
          formatted: '521 ms',
          dataTestSubj: 'synth-step-metric-lcp',
        },
      ],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders transfer size, FCP, and LCP stats', () => {
    const { getByTestId } = render(<StepMetrics />);

    expect(getByTestId('synth-step-metric-transfer-size')).toHaveTextContent('558 KB');
    expect(getByTestId('synth-step-metric-fcp')).toHaveTextContent('402 ms');
    expect(getByTestId('synth-step-metric-lcp')).toHaveTextContent('521 ms');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CostSavingsMetric } from './cost_savings_metric';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { useSignalIndexWithDefault } from '../../hooks/use_signal_index_with_default';
import { useAIValueExportContext } from '../../providers/ai_value/export_provider';
import { useMetricAnimation } from '../../hooks/use_metric_animation';
import * as i18n from './translations';

// Mock VisualizationEmbeddable
vi.mock('../../../common/components/visualization_actions/visualization_embeddable', () => {
  const mocked = {
    VisualizationEmbeddable: vi.fn(() => <div data-test-subj="mock-visualization-embeddable" />),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_signal_index_with_default', () => {
  const mocked = {
    useSignalIndexWithDefault: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../providers/ai_value/export_provider', () => {
  const mocked = {
    useAIValueExportContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../hooks/use_metric_animation', () => {
  const mocked = {
    useMetricAnimation: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./sample_metric', () => {
  const mocked = {
    SampleMetric: vi.fn(({ title }: { title: string }) => (
      <div data-test-subj="mock-sample-metric">{title}</div>
    )),
  };
  return { ...mocked, default: mocked };
});

const useAIValueExportContextMock = useAIValueExportContext as Mock;
const useMetricAnimationMock = useMetricAnimation as Mock;

const defaultProps = {
  isSample: false as const,
  from: '2023-01-01T00:00:00.000Z',
  to: '2023-01-31T23:59:59.999Z',
  minutesPerAlert: 10,
  analystHourlyRate: 100,
};

const mockUseSignalIndexWithDefault = useSignalIndexWithDefault as MockedFunction<
  typeof useSignalIndexWithDefault
>;

describe('CostSavingsMetric', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSignalIndexWithDefault.mockReturnValue('.alerts-security.alerts-default');
  });

  it('passes correct props to VisualizationEmbeddable', () => {
    render(<CostSavingsMetric {...defaultProps} />);
    expect(VisualizationEmbeddable).toHaveBeenCalledWith(
      expect.objectContaining({
        'data-test-subj': 'cost-savings-metric',
        timerange: { from: defaultProps.from, to: defaultProps.to },
        id: expect.stringContaining('CostSavingsMetricQuery-metric'),
        inspectTitle: expect.any(String),
        scopeId: expect.any(String),
        withActions: expect.any(Array),
      }),
      {}
    );
  });

  it('calls useSignalIndexWithDefault hook', () => {
    render(<CostSavingsMetric {...defaultProps} />);
    expect(mockUseSignalIndexWithDefault).toHaveBeenCalled();
  });

  it('calls useAIValueExportContext hook', () => {
    render(<CostSavingsMetric {...defaultProps} />);
    expect(useAIValueExportContextMock).toHaveBeenCalled();
  });

  it('calls useMetricAnimationMock hook', () => {
    render(<CostSavingsMetric {...defaultProps} />);
    expect(useMetricAnimationMock).toHaveBeenCalled();
  });

  describe('export mode', () => {
    beforeEach(() => {
      // Force it into export mode
      useAIValueExportContextMock.mockReturnValue({
        isExportMode: true,
      });
    });

    it('should not attempt to animate the component', () => {
      render(<CostSavingsMetric {...defaultProps} />);
      expect(useMetricAnimationMock).not.toHaveBeenCalled();
    });
  });

  describe('sample variant', () => {
    it('renders the sample metric and skips the live Lens visualization', () => {
      render(<CostSavingsMetric {...defaultProps} isSample={true} />);
      expect(VisualizationEmbeddable).not.toHaveBeenCalled();
      expect(screen.getByTestId('mock-sample-metric')).toBeInTheDocument();
      expect(screen.getByText(i18n.COST_SAVINGS_TITLE)).toBeInTheDocument();
    });

    it('does not call useMetricAnimation in sample variant', () => {
      render(<CostSavingsMetric {...defaultProps} isSample={true} />);
      expect(useMetricAnimationMock).not.toHaveBeenCalled();
    });
  });
});

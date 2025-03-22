/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { useAlertHistogramCount } from './use_alert_histogram_count';
import { useVisualizationResponse } from '../../../common/components/visualization_actions/use_visualization_response';

jest.mock('../../../common/components/visualization_actions/use_visualization_response', () => ({
  useVisualizationResponse: jest.fn().mockReturnValue({ responses: [{ hits: { total: 100 } }] }),
}));

describe('useAlertHistogramCount', () => {
  const defaultProps = {
    visualizationId: 'mockVisualizationId',
  };

  it('returns visualization alerts count', () => {
    const props = { ...defaultProps, isChartEmbeddablesEnabled: true };
    const { result } = renderHook(() => useAlertHistogramCount(props), {
      wrapper: TestProviders,
    });
    expect(result.current).toEqual('Showing: 100 alerts');
  });

  describe.each([
    {
      responses: undefined,
      title: 'undefined',
    },
    {
      responses: [],
      title: 'empty array',
    },
    {
      responses: [{}],
      title: 'array with empty object',
    },
    {
      responses: [{ hits: {} }],
      title: 'array with object with empty hits',
    },
    {
      responses: [{ hits: { total: undefined } }],
      title: 'array with object with hits with undefined total',
    },
  ])('when visualization responses is $title', () => {
    it('returns Showing: 0 alerts', () => {
      const props = { ...defaultProps, isChartEmbeddablesEnabled: true };
      (useVisualizationResponse as jest.Mock).mockReturnValue({ responses: [] });
      const { result } = renderHook(() => useAlertHistogramCount(props), {
        wrapper: TestProviders,
      });
      expect(result.current).toEqual('Showing: 0 alerts');
    });
  });
});

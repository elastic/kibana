/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { MatrixHistogram } from '.';
import { TestProviders } from '../../mock';
import { mockRuntimeMappings } from '../../containers/source/mock';
import { getDnsTopDomainsLensAttributes } from '../visualization_actions/lens_attributes/network/dns_top_domains';
import { useQueryToggle } from '../../containers/query_toggle';

jest.mock('../../containers/query_toggle');

jest.mock('../visualization_actions/actions');
jest.mock('../visualization_actions/visualization_embeddable');

jest.mock('../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

const mockUseVisualizationResponse = jest.fn(() => ({
  responses: [{ aggregations: [{ buckets: [{ key: '1234' }] }], hits: { total: 999 } }],
  requests: [],
  loading: false,
}));
jest.mock('../visualization_actions/use_visualization_response', () => ({
  useVisualizationResponse: () => mockUseVisualizationResponse(),
}));

const mockLocation = jest.fn().mockReturnValue({ pathname: '/test' });

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useLocation: () => mockLocation(),
  };
});

describe('Matrix Histogram Component', () => {
  const mockMatrixOverTimeHistogramProps = {
    defaultIndex: ['defaultIndex'],
    defaultStackByOption: {
      text: 'dns.question.registered_domain',
      value: 'dns.question.registered_domain',
    },
    endDate: '2019-07-18T20:00:00.000Z',
    id: 'mockId',
    indexNames: [],
    isInspected: false,
    isPtrIncluded: true,
    setQuery: jest.fn(),
    stackByOptions: [
      { text: 'dns.question.registered_domain', value: 'dns.question.registered_domain' },
    ],
    startDate: '2019-07-18T19:00: 00.000Z',
    subtitle: jest.fn((totalCount) => `Showing: ${totalCount} events`),
    totalCount: -1,
    title: 'mockTitle',
    runtimeMappings: mockRuntimeMappings,
  };
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const mockSetToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: mockSetToggle });
  });

  describe('rendering', () => {
    test('it should not render VisualizationActions', () => {
      render(
        <TestProviders>
          <MatrixHistogram {...mockMatrixOverTimeHistogramProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('visualizationActions')).not.toBeInTheDocument();
    });

    test('it should render Lens Visualization', () => {
      render(
        <TestProviders>
          <MatrixHistogram {...mockMatrixOverTimeHistogramProps} />
        </TestProviders>
      );
      expect(screen.getByTestId('visualization-embeddable')).toBeInTheDocument();
    });

    test('it should render visualization count as subtitle', () => {
      const { rerender } = render(
        <TestProviders>
          <MatrixHistogram {...mockMatrixOverTimeHistogramProps} />
        </TestProviders>
      );
      rerender(
        <TestProviders>
          <MatrixHistogram {...mockMatrixOverTimeHistogramProps} endDate={'100'} />
        </TestProviders>
      );

      expect(screen.getByTestId('header-section-subtitle').textContent).toBe('Showing: 999 events');
    });

    test('it should render 0 as subtitle when buckets are empty', () => {
      mockUseVisualizationResponse.mockReturnValue({
        requests: [],
        responses: [{ aggregations: [{ buckets: [] }], hits: { total: 999 } }],
        loading: false,
      });

      const { rerender } = render(
        <TestProviders>
          <MatrixHistogram {...mockMatrixOverTimeHistogramProps} />
        </TestProviders>
      );

      rerender(
        <TestProviders>
          <MatrixHistogram {...mockMatrixOverTimeHistogramProps} endDate={'100'} />
        </TestProviders>
      );

      expect(screen.getByTestId('header-section-subtitle').textContent).toBe('Showing: 0 events');
    });
  });

  describe('spacer', () => {
    test('it renders a spacer by default', () => {
      render(
        <TestProviders>
          <MatrixHistogram {...mockMatrixOverTimeHistogramProps} />
        </TestProviders>
      );
      expect(screen.getByTestId('spacer')).toBeInTheDocument();
    });

    test('it does NOT render a spacer when showSpacer is false', () => {
      render(
        <TestProviders>
          <MatrixHistogram {...mockMatrixOverTimeHistogramProps} showSpacer={false} />
        </TestProviders>
      );
      expect(screen.queryByTestId('spacer')).not.toBeInTheDocument();
    });
  });

  describe('select dropdown', () => {
    test('should be hidden if only one option is provided', () => {
      render(
        <TestProviders>
          <MatrixHistogram {...mockMatrixOverTimeHistogramProps} />
        </TestProviders>
      );
      expect(screen.queryByText('EuiSelect')).not.toBeInTheDocument();
    });
  });

  describe('Inspect button', () => {
    test('it does not render Inspect button', () => {
      const testProps = {
        ...mockMatrixOverTimeHistogramProps,
        getLensAttributes: getDnsTopDomainsLensAttributes,
      };
      render(
        <TestProviders>
          <MatrixHistogram {...testProps} />
        </TestProviders>
      );
      expect(screen.queryByTestId('inspect-icon-button')).not.toBeInTheDocument();
    });
  });

  describe('toggle query', () => {
    const testProps = {
      ...mockMatrixOverTimeHistogramProps,
      getLensAttributes: getDnsTopDomainsLensAttributes,
    };

    test('toggleQuery updates toggleStatus', () => {
      render(
        <TestProviders>
          <MatrixHistogram {...testProps} />
        </TestProviders>
      );
      expect(screen.getByTestId('visualization-embeddable')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('query-toggle-header'));
      expect(mockSetToggle).toHaveBeenCalledWith(false);
    });

    test('toggleStatus=true, render components', () => {
      render(
        <TestProviders>
          <MatrixHistogram {...testProps} />
        </TestProviders>
      );
      expect(screen.getByTestId('visualization-embeddable')).toBeInTheDocument();
    });

    test('toggleStatus=false, do not render components', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      render(
        <TestProviders>
          <MatrixHistogram {...testProps} />
        </TestProviders>
      );
      expect(screen.queryByText('MatrixLoader')).not.toBeInTheDocument();
    });

    test('toggleStatus=false, skip', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      render(
        <TestProviders>
          <MatrixHistogram {...testProps} />
        </TestProviders>
      );

      expect(screen.queryByTestId('visualization-embeddable')).not.toBeInTheDocument();
    });
  });
});

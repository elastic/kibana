/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactWrapper } from 'enzyme';
import { mount, type ComponentType } from 'enzyme';
import React from 'react';

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
  let wrapper: ReactWrapper;

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
    beforeEach(() => {
      wrapper = mount(<MatrixHistogram {...mockMatrixOverTimeHistogramProps} />, {
        wrappingComponent: TestProviders as ComponentType<{}>,
      });
    });

    test('it should not render VisualizationActions', () => {
      expect(wrapper.find(`[data-test-subj="visualizationActions"]`).exists()).toEqual(false);
    });

    test('it should render Lens Visualization', () => {
      expect(wrapper.find(`[data-test-subj="visualization-embeddable"]`).exists()).toEqual(true);
    });

    test('it should render visualization count as subtitle', () => {
      wrapper.setProps({ endDate: 100 });
      wrapper.update();

      expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).text()).toEqual(
        'Showing: 999 events'
      );
    });

    test('it should render 0 as subtitle when buckets are empty', () => {
      mockUseVisualizationResponse.mockReturnValue({
        requests: [],
        responses: [{ aggregations: [{ buckets: [] }], hits: { total: 999 } }],
        loading: false,
      });
      wrapper.setProps({ endDate: 100 });
      wrapper.update();

      expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).text()).toEqual(
        'Showing: 0 events'
      );
    });
  });

  describe('spacer', () => {
    test('it renders a spacer by default', () => {
      wrapper = mount(<MatrixHistogram {...mockMatrixOverTimeHistogramProps} />, {
        wrappingComponent: TestProviders as ComponentType<{}>,
      });
      expect(wrapper.find('[data-test-subj="spacer"]').exists()).toEqual(true);
    });

    test('it does NOT render a spacer when showSpacer is false', () => {
      wrapper = mount(
        <MatrixHistogram {...mockMatrixOverTimeHistogramProps} showSpacer={false} />,
        {
          wrappingComponent: TestProviders as ComponentType<{}>,
        }
      );
      expect(wrapper.find('[data-test-subj="spacer"]').exists()).toEqual(false);
    });
  });

  describe('select dropdown', () => {
    test('should be hidden if only one option is provided', () => {
      wrapper = mount(<MatrixHistogram {...mockMatrixOverTimeHistogramProps} />, {
        wrappingComponent: TestProviders as ComponentType<{}>,
      });
      expect(wrapper.find('EuiSelect').exists()).toEqual(false);
    });
  });

  describe('Inspect button', () => {
    test('it does not render Inspect button', () => {
      const testProps = {
        ...mockMatrixOverTimeHistogramProps,
        getLensAttributes: getDnsTopDomainsLensAttributes,
      };
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders as ComponentType<{}>,
      });
      expect(wrapper.find('[data-test-subj="inspect-icon-button"]').exists()).toEqual(false);
    });
  });

  describe('toggle query', () => {
    const testProps = {
      ...mockMatrixOverTimeHistogramProps,
      getLensAttributes: getDnsTopDomainsLensAttributes,
    };

    test('toggleQuery updates toggleStatus', () => {
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders as ComponentType<{}>,
      });
      expect(wrapper.find('[data-test-subj="visualization-embeddable"]').exists()).toEqual(true);
      wrapper.find('[data-test-subj="query-toggle-header"]').first().simulate('click');
      expect(mockSetToggle).toBeCalledWith(false);
    });

    test('toggleStatus=true, render components', () => {
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders as ComponentType<{}>,
      });
      expect(wrapper.find('[data-test-subj="visualization-embeddable"]').exists()).toEqual(true);
    });

    test('toggleStatus=false, do not render components', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders as ComponentType<{}>,
      });
      expect(wrapper.find('MatrixLoader').exists()).toBe(false);
    });

    test('toggleStatus=false, skip', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders as ComponentType<{}>,
      });

      expect(wrapper.find('[data-test-subj="visualization-embeddable"]').exists()).toEqual(false);
    });
  });
});

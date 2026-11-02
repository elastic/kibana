/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';
import { DonutChart } from './donut_chart';
import { renderWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { mockCore } from '../../../lib/helper/rtl_helpers';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn().mockImplementation(() => ({
    services: mockCore(),
  })),
}));

describe('DonutChart component', () => {
  it('passes correct props without errors for valid props', () => {
    const props = {
      down: 32,
      up: 95,
      height: 125,
      width: 125,
    };

    const wrapper = shallowWithIntl(<DonutChart {...props} />);
    const chart = wrapper.find('Chart');
    expect(chart.prop('size')).toBe(125);
    expect(chart.prop('aria-label')).toContain('32 of 127 monitors are down');
    expect(wrapper.find('Partition').prop('data')).toEqual([
      { value: 32, label: 'Down' },
      { value: 95, label: 'Up' },
    ]);

    const legend = wrapper.find('DonutChartLegend');
    expect(legend.prop('down')).toBe(32);
    expect(legend.prop('up')).toBe(95);
  });

  it('renders a donut chart', () => {
    const props = {
      down: 32,
      up: 95,
      height: 125,
      width: 125,
    };

    const wrapper = renderWithIntl(<DonutChart {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders a green check when all monitors are up', () => {
    const props = {
      down: 0,
      up: 95,
      height: 125,
      width: 125,
    };

    const wrapper = renderWithIntl(<DonutChart {...props} />);
    expect(wrapper).toMatchSnapshot();

    const greenCheck = wrapper.find('.greenCheckIcon');

    expect(greenCheck).toHaveLength(1);
  });
});

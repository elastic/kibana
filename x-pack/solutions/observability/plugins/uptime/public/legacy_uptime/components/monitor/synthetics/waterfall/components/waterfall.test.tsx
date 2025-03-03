/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { WaterfallChart } from './waterfall_chart';
import { renderLegendItem } from '../../step_detail/waterfall/waterfall_chart_wrapper';
import { render } from '../../../../../lib/helper/rtl_helpers';

import 'jest-canvas-mock';
import { waitFor } from '@testing-library/react';

describe('waterfall', () => {
  it('sets the correct height in case of full height', () => {
    const Component = () => {
      return (
        <div style={{ height: 768, width: 1366 }}>
          <WaterfallChart
            tickFormat={(d: number) => `${Number(d).toFixed(0)} ms`}
            domain={{
              max: 3371,
              min: 0,
            }}
            barStyleAccessor={(datum) => {
              return datum.datum.config.colour;
            }}
            renderSidebarItem={undefined}
            renderLegendItem={renderLegendItem}
            fullHeight={true}
          />
        </div>
      );
    };

    const { getByTestId } = render(<Component />);

    const chartWrapper = getByTestId('waterfallOuterContainer');

    waitFor(() => {
      expect(chartWrapper).toHaveStyleRule('height', 'calc(100vh - 62px)');
    });
  });
});

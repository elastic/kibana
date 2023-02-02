/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Chart, Settings, BarSeries, LineSeries, Axis, DataGenerator } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

const dg = new DataGenerator();
const data1 = dg.generateGroupedSeries(20, 1);
const data2 = dg.generateGroupedSeries(20, 5);

const AttachmentContent: React.FC = (props) => {
  return (
    <EuiFlexGroup data-test-subj="test-attachment-content">
      <EuiFlexItem>
        <Chart size={{ height: 200 }}>
          <Settings showLegend={false} />
          <BarSeries
            id="status"
            name="Status"
            data={data2}
            xAccessor={'x'}
            yAccessors={['y']}
            splitSeriesAccessors={['g']}
            stackAccessors={['g']}
          />
          <LineSeries
            id="control"
            name="Control"
            data={data1}
            xAccessor={'x'}
            yAccessors={['y']}
            color={['black']}
          />
          <Axis id="bottom-axis" position="bottom" showGridLines />
          <Axis
            id="left-axis"
            position="left"
            showGridLines
            tickFormat={(d) => Number(d).toFixed(2)}
          />
        </Chart>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { AttachmentContent as default };

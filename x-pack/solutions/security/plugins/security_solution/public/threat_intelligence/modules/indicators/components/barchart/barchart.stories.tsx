/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import type { StoryFn } from '@storybook/react';
import type { TimeRangeBounds } from '@kbn/data-plugin/common';
import { StoryProvidersComponent } from '../../../../mocks/story_providers';
import { mockKibanaTimelinesService } from '../../../../mocks/mock_kibana_timelines_service';
import { IndicatorsBarChart } from './barchart';
import type { ChartSeries } from '../../services/fetch_aggregated_indicators';

const mockIndicators: ChartSeries[] = [
  {
    x: new Date('1 Jan 2022 00:00:00 GMT').getTime(),
    y: 2,
    g: '[Filebeat] AbuseCH Malware',
  },
  {
    x: new Date('1 Jan 2022 00:00:00 GMT').getTime(),
    y: 10,
    g: '[Filebeat] AbuseCH MalwareBazaar',
  },
  {
    x: new Date('1 Jan 2022 06:00:00 GMT').getTime(),
    y: 0,
    g: '[Filebeat] AbuseCH Malware',
  },
  {
    x: new Date('1 Jan 2022 06:00:00 GMT').getTime(),
    y: 0,
    g: '[Filebeat] AbuseCH MalwareBazaar',
  },
  {
    x: new Date('1 Jan 2022 12:00:00 GMT').getTime(),
    y: 25,
    g: '[Filebeat] AbuseCH Malware',
  },
  {
    x: new Date('1 Jan 2022 18:00:00 GMT').getTime(),
    y: 15,
    g: '[Filebeat] AbuseCH MalwareBazaar',
  },
];
const validDate: string = '1 Jan 2022 00:00:00 GMT';

const numberOfDays = 1;

const mockDateRange: TimeRangeBounds = {
  min: moment(validDate),
  max: moment(validDate).add(numberOfDays, 'days'),
};

const mockField = { label: 'threat.indicator.ip', value: 'ip' };

export default {
  component: IndicatorsBarChart,
  title: 'IndicatorsBarChart',
};

export const Default: StoryFn = () => (
  <StoryProvidersComponent kibana={{ timelines: mockKibanaTimelinesService }}>
    <IndicatorsBarChart indicators={mockIndicators} field={mockField} dateRange={mockDateRange} />
  </StoryProvidersComponent>
);

export const NoData: StoryFn = () => (
  <StoryProvidersComponent kibana={{ timelines: mockKibanaTimelinesService }}>
    <IndicatorsBarChart indicators={[]} field={mockField} dateRange={mockDateRange} />
  </StoryProvidersComponent>
);

export const CustomHeight: StoryFn = () => {
  const mockHeight = '500px';

  return (
    <StoryProvidersComponent kibana={{ timelines: mockKibanaTimelinesService }}>
      <IndicatorsBarChart
        indicators={mockIndicators}
        field={mockField}
        dateRange={mockDateRange}
        height={mockHeight}
      />
    </StoryProvidersComponent>
  );
};

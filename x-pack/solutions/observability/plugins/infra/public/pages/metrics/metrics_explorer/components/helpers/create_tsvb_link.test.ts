/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTSVBLink, createFilterFromOptions } from './create_tsvb_link';
import { options, timeRange, chartOptions } from '../../../../../utils/fixtures/metrics_explorer';
import {
  MetricsExplorerYAxisMode,
  MetricsExplorerChartType,
} from '../../hooks/use_metrics_explorer_options';
import type { MetricsExplorerOptions } from '../../hooks/use_metrics_explorer_options';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-id'),
}));

const indexPattern = 'metricbeat-*';
const series = { id: 'example-01', rows: [], columns: [] };

describe('createTSVBLink()', () => {
  it('should just work', () => {
    const link = createTSVBLink(indexPattern, options, series, timeRange, chartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_min:0,axis_position:left,axis_scale:normal,default_index_pattern:'metricbeat-*',filter:(language:kuery,query:'host.name : \"example-01\"'),id:test-id,index_pattern:'metricbeat-*',interval:auto,series:!((axis_position:right,chart_type:line,color:#16C5C0,fill:0,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))',
        type: 'metrics',
      },
    });
  });

  it('should work with rates', () => {
    const customOptions: MetricsExplorerOptions = {
      ...options,
      metrics: [{ aggregation: 'rate', field: 'host.network.egress.bytes' }],
    };
    const link = createTSVBLink(indexPattern, customOptions, series, timeRange, chartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_min:0,axis_position:left,axis_scale:normal,default_index_pattern:'metricbeat-*',filter:(language:kuery,query:'host.name : \"example-01\"'),id:test-id,index_pattern:'metricbeat-*',interval:auto,series:!((axis_position:right,chart_type:line,color:#16C5C0,fill:0,formatter:bytes,id:test-id,label:'rate(host.network.egress.bytes)',line_width:2,metrics:!((field:host.network.egress.bytes,id:test-id,type:max),(field:test-id,id:test-id,type:derivative,unit:'1s'),(field:test-id,id:test-id,type:positive_only)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}}/s)),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))',
        type: 'metrics',
      },
    });
  });
  it('should work with time range', () => {
    const customTimeRange = { ...timeRange, from: 'now-10m', to: 'now' };
    const link = createTSVBLink(indexPattern, options, series, customTimeRange, chartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_min:0,axis_position:left,axis_scale:normal,default_index_pattern:'metricbeat-*',filter:(language:kuery,query:'host.name : \"example-01\"'),id:test-id,index_pattern:'metricbeat-*',interval:auto,series:!((axis_position:right,chart_type:line,color:#16C5C0,fill:0,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-10m,to:now))',
        type: 'metrics',
      },
    });
  });

  it('should work with filterQuery', () => {
    const customOptions = { ...options, filterQuery: 'system.network.name:lo*' };
    const link = createTSVBLink('my-beats-*', customOptions, series, timeRange, chartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_min:0,axis_position:left,axis_scale:normal,default_index_pattern:'my-beats-*',filter:(language:kuery,query:'system.network.name:lo* and host.name : \"example-01\"'),id:test-id,index_pattern:'my-beats-*',interval:auto,series:!((axis_position:right,chart_type:line,color:#16C5C0,fill:0,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))',
        type: 'metrics',
      },
    });
  });

  it('should remove axis_min from link', () => {
    const customChartOptions = { ...chartOptions, yAxisMode: MetricsExplorerYAxisMode.auto };
    const link = createTSVBLink(indexPattern, options, series, timeRange, customChartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_position:left,axis_scale:normal,default_index_pattern:'metricbeat-*',filter:(language:kuery,query:'host.name : \"example-01\"'),id:test-id,index_pattern:'metricbeat-*',interval:auto,series:!((axis_position:right,chart_type:line,color:#16C5C0,fill:0,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))',
        type: 'metrics',
      },
    });
  });

  it('should change series to area', () => {
    const customChartOptions = { ...chartOptions, type: MetricsExplorerChartType.area };
    const link = createTSVBLink(indexPattern, options, series, timeRange, customChartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_min:0,axis_position:left,axis_scale:normal,default_index_pattern:'metricbeat-*',filter:(language:kuery,query:'host.name : \"example-01\"'),id:test-id,index_pattern:'metricbeat-*',interval:auto,series:!((axis_position:right,chart_type:line,color:#16C5C0,fill:0.5,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))',
        type: 'metrics',
      },
    });
  });

  it('should change series to area and stacked', () => {
    const customChartOptions = {
      ...chartOptions,
      type: MetricsExplorerChartType.area,
      stack: true,
    };
    const link = createTSVBLink(indexPattern, options, series, timeRange, customChartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_min:0,axis_position:left,axis_scale:normal,default_index_pattern:'metricbeat-*',filter:(language:kuery,query:'host.name : \"example-01\"'),id:test-id,index_pattern:'metricbeat-*',interval:auto,series:!((axis_position:right,chart_type:line,color:#16C5C0,fill:0.5,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:stacked,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))',
        type: 'metrics',
      },
    });
  });

  it('should use the workaround index pattern when there are multiple listed in the source', () => {
    const link = createTSVBLink('my-beats-*,metrics-*', options, series, timeRange, chartOptions);
    expect(link).toStrictEqual({
      app: 'visualize',
      hash: '/create',
      search: {
        _a: "(filters:!(),linked:!f,query:(language:kuery,query:''),uiState:(),vis:(aggs:!(),params:(axis_formatter:number,axis_min:0,axis_position:left,axis_scale:normal,default_index_pattern:'metric*',filter:(language:kuery,query:'host.name : \"example-01\"'),id:test-id,index_pattern:'metric*',interval:auto,series:!((axis_position:right,chart_type:line,color:#16C5C0,fill:0,formatter:percent,id:test-id,label:'avg(system.cpu.user.pct)',line_width:2,metrics:!((field:system.cpu.user.pct,id:test-id,type:avg)),point_size:0,separate_axis:0,split_mode:everything,stacked:none,value_template:{{value}})),show_grid:1,show_legend:1,time_field:'@timestamp',type:timeseries),title:example-01,type:metrics))",
        _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-1h,to:now))',
        type: 'metrics',
      },
    });
  });

  test('createFilterFromOptions()', () => {
    const customOptions = { ...options, groupBy: 'host.name' };
    const customSeries = { ...series, id: 'test"foo' };
    expect(createFilterFromOptions(customOptions, customSeries)).toEqual({
      language: 'kuery',
      query: 'host.name : "test\\"foo"',
    });
  });
});
